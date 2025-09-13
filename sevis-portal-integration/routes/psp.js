/**
 * Public Servant Pass (PSP) Routes
 * Implements the PSP application system as described in the business document
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

function createPSPRoutes(authMiddleware) {
  const router = express.Router();
  
  // In-memory storage (use database in production)
  const applications = new Map();
  const approvedPasses = new Map();

  /**
   * GET /psp/dashboard
   * PSP Dashboard - shows current application status
   */
  router.get('/dashboard', authMiddleware.requireAuth, (req, res) => {
    const userApplications = Array.from(applications.values())
      .filter(app => app.userSub === req.user.sub)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    const userPass = approvedPasses.get(req.user.sub);

    res.json({
      user: req.user,
      currentApplication: userApplications[0] || null,
      allApplications: userApplications,
      publicServantPass: userPass || null,
      canApply: !userApplications.some(app => app.status === 'pending') && !userPass
    });
  });

  /**
   * POST /psp/apply
   * Submit PSP application
   */
  router.post('/apply', authMiddleware.requireAuth, async (req, res) => {
    try {
      const { employeeId, governmentEmail, department, position } = req.body;

      // Validate required fields
      if (!employeeId || !governmentEmail) {
        return res.status(400).json({
          error: 'Employee ID and Government Email are required'
        });
      }

      // Validate government email format
      if (!governmentEmail.endsWith('.gov.pg')) {
        return res.status(400).json({
          error: 'Must use official government email (.gov.pg)'
        });
      }

      // Check if user already has pending application
      const existingApplication = Array.from(applications.values())
        .find(app => app.userSub === req.user.sub && app.status === 'pending');

      if (existingApplication) {
        return res.status(409).json({
          error: 'You already have a pending application'
        });
      }

      // Check if user already has approved pass
      if (approvedPasses.has(req.user.sub)) {
        return res.status(409).json({
          error: 'You already have an approved Public Servant Pass'
        });
      }

      // Create application
      const applicationId = uuidv4();
      const application = {
        id: applicationId,
        userSub: req.user.sub,
        applicantInfo: {
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone,
          address: req.user.address
        },
        applicationData: {
          employeeId,
          governmentEmail,
          department: department || '',
          position: position || ''
        },
        status: 'pending',
        submittedAt: new Date().toISOString(),
        reviewedAt: null,
        reviewedBy: null,
        rejectionReason: null
      };

      applications.set(applicationId, application);

      // Send notification to DPM (implement your notification system)
      await notifyDPM(application);

      res.status(201).json({
        message: 'Public Servant Pass application submitted successfully',
        applicationId,
        status: 'pending',
        submittedAt: application.submittedAt
      });

    } catch (error) {
      console.error('PSP application error:', error);
      res.status(500).json({ error: 'Application submission failed' });
    }
  });

  /**
   * GET /psp/application/:id
   * Get specific application details
   */
  router.get('/application/:id', authMiddleware.requireAuth, (req, res) => {
    const application = applications.get(req.params.id);

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Ensure user can only access their own applications
    if (application.userSub !== req.user.sub) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(application);
  });

  /**
   * GET /psp/pass
   * Get user's Public Servant Pass (if approved)
   */
  router.get('/pass', authMiddleware.requireAuth, (req, res) => {
    const userPass = approvedPasses.get(req.user.sub);

    if (!userPass) {
      return res.status(404).json({ 
        error: 'No approved Public Servant Pass found',
        canApply: true
      });
    }

    res.json(userPass);
  });

  /**
   * GET /psp/pass/download
   * Download PSP as QR code image
   */
  router.get('/pass/download', authMiddleware.requireAuth, async (req, res) => {
    try {
      const userPass = approvedPasses.get(req.user.sub);

      if (!userPass) {
        return res.status(404).json({ error: 'No approved pass found' });
      }

      // Generate QR code containing the pass UUID
      const qrCodeBuffer = await QRCode.toBuffer(userPass.uuid, {
        type: 'png',
        width: 300,
        margin: 2
      });

      res.set({
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="psp-${userPass.uuid}.png"`
      });

      res.send(qrCodeBuffer);

    } catch (error) {
      console.error('QR code generation error:', error);
      res.status(500).json({ error: 'Failed to generate QR code' });
    }
  });

  // ========== DPM ADMIN ROUTES ==========

  /**
   * GET /psp/admin/applications
   * List all pending applications (DPM only)
   */
  router.get('/admin/applications', 
    authMiddleware.requireAuth,
    authMiddleware.requirePermission('dpm_admin'),
    (req, res) => {
      const { status = 'pending' } = req.query;
      
      const filteredApplications = Array.from(applications.values())
        .filter(app => !status || app.status === status)
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

      res.json({
        applications: filteredApplications,
        total: filteredApplications.length,
        filters: { status }
      });
    }
  );

  /**
   * POST /psp/admin/applications/:id/approve
   * Approve PSP application (DPM only)
   */
  router.post('/admin/applications/:id/approve',
    authMiddleware.requireAuth,
    authMiddleware.requirePermission('dpm_admin'),
    async (req, res) => {
      try {
        const application = applications.get(req.params.id);

        if (!application) {
          return res.status(404).json({ error: 'Application not found' });
        }

        if (application.status !== 'pending') {
          return res.status(409).json({ error: 'Application already processed' });
        }

        // Create Public Servant Pass
        const passUUID = uuidv4();
        const publicServantPass = {
          uuid: passUUID,
          userSub: application.userSub,
          holderInfo: application.applicantInfo,
          employmentInfo: application.applicationData,
          issuedAt: new Date().toISOString(),
          issuedBy: req.user.sub,
          status: 'active',
          qrCode: passUUID // QR code contains the UUID
        };

        // Update application status
        application.status = 'approved';
        application.reviewedAt = new Date().toISOString();
        application.reviewedBy = req.user.sub;

        // Store the approved pass
        approvedPasses.set(application.userSub, publicServantPass);

        // Send approval notification (implement your notification system)
        await notifyApplicant(application.applicantInfo.email, 'approved', publicServantPass);

        res.json({
          message: 'Application approved successfully',
          passUUID,
          issuedAt: publicServantPass.issuedAt
        });

      } catch (error) {
        console.error('Application approval error:', error);
        res.status(500).json({ error: 'Approval failed' });
      }
    }
  );

  /**
   * POST /psp/admin/applications/:id/reject
   * Reject PSP application (DPM only)
   */
  router.post('/admin/applications/:id/reject',
    authMiddleware.requireAuth,
    authMiddleware.requirePermission('dpm_admin'),
    async (req, res) => {
      try {
        const { reason } = req.body;
        const application = applications.get(req.params.id);

        if (!application) {
          return res.status(404).json({ error: 'Application not found' });
        }

        if (application.status !== 'pending') {
          return res.status(409).json({ error: 'Application already processed' });
        }

        // Update application status
        application.status = 'rejected';
        application.reviewedAt = new Date().toISOString();
        application.reviewedBy = req.user.sub;
        application.rejectionReason = reason || 'No reason provided';

        // Send rejection notification
        await notifyApplicant(application.applicantInfo.email, 'rejected', null, reason);

        res.json({
          message: 'Application rejected',
          rejectionReason: application.rejectionReason
        });

      } catch (error) {
        console.error('Application rejection error:', error);
        res.status(500).json({ error: 'Rejection failed' });
      }
    }
  );

  /**
   * GET /psp/verify/:uuid
   * Verify Public Servant Pass by UUID (public endpoint)
   */
  router.get('/verify/:uuid', async (req, res) => {
    try {
      const { uuid } = req.params;
      
      // Find pass by UUID
      const userPass = Array.from(approvedPasses.values())
        .find(pass => pass.uuid === uuid);

      if (!userPass) {
        return res.status(404).json({
          valid: false,
          error: 'Public Servant Pass not found'
        });
      }

      if (userPass.status !== 'active') {
        return res.status(410).json({
          valid: false,
          error: 'Public Servant Pass is no longer active'
        });
      }

      res.json({
        valid: true,
        holderInfo: {
          name: userPass.holderInfo.name,
          department: userPass.employmentInfo.department,
          position: userPass.employmentInfo.position
        },
        issuedAt: userPass.issuedAt,
        status: userPass.status
      });

    } catch (error) {
      console.error('Pass verification error:', error);
      res.status(500).json({ error: 'Verification failed' });
    }
  });

  // Helper functions
  async function notifyDPM(application) {
    // Implement DPM notification (email, webhook, etc.)
    console.log(`New PSP application: ${application.id}`);
  }

  async function notifyApplicant(email, status, pass, reason) {
    // Implement applicant notification
    console.log(`PSP application ${status} for ${email}`);
  }

  return router;
}

module.exports = createPSPRoutes;