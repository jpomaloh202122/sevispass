# AWS SES Setup for SevisPass

This document explains how to configure AWS SES (Simple Email Service) for sending emails in the SevisPass application.

## Prerequisites

1. AWS Account with SES access
2. Domain verification or email address verification in AWS SES
3. AWS CLI configured or AWS IAM credentials

## 1. AWS SES Configuration

### Step 1: Verify Your Domain or Email Address

1. Go to AWS SES Console: https://console.aws.amazon.com/ses/
2. Navigate to "Verified identities"
3. Click "Create identity"
4. Choose "Domain" (recommended) or "Email address"
5. Enter your domain (e.g., `sevispass.gov.pg`) or email address
6. Complete the verification process

### Step 2: Create IAM User for SES

1. Go to AWS IAM Console: https://console.aws.amazon.com/iam/
2. Create a new user (e.g., `sevispass-ses-user`)
3. Attach the following policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ses:SendEmail",
                "ses:SendRawEmail"
            ],
            "Resource": "*"
        }
    ]
}
```

4. Create access keys for this user
5. Save the Access Key ID and Secret Access Key

### Step 3: Configure Environment Variables

Update your `.env` file with the AWS credentials:

```env
# AWS SES Configuration
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="YOUR_AWS_ACCESS_KEY_ID"
AWS_SECRET_ACCESS_KEY="YOUR_AWS_SECRET_ACCESS_KEY"
SES_FROM_EMAIL="noreply@sevispass.gov.pg"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

**Important Notes:**
- Replace `YOUR_AWS_ACCESS_KEY_ID` and `YOUR_AWS_SECRET_ACCESS_KEY` with actual values
- Ensure `SES_FROM_EMAIL` is a verified email address or from a verified domain
- Update `NEXT_PUBLIC_APP_URL` with your actual domain

## 2. Testing the Configuration

### Option 1: API Endpoint Test

1. Start your development server: `npm run dev`
2. Test basic email sending:
   ```bash
   curl -X POST http://localhost:3000/api/test/email \
     -H "Content-Type: application/json" \
     -d '{"testEmail": "your-test@example.com"}'
   ```

3. Test welcome email template:
   ```bash
   curl "http://localhost:3000/api/test/email?email=your-test@example.com&name=Test%20User"
   ```

### Option 2: Frontend Test

1. Register a new user account
2. Check if the welcome email is received
3. Book a biometric appointment and check for confirmation email
4. Cancel an appointment and check for cancellation email

## 3. Production Considerations

### Move Out of SES Sandbox

By default, SES accounts start in sandbox mode with limitations:
- Can only send to verified email addresses
- Sending limit of 200 emails per 24-hour period
- Maximum send rate of 1 email per second

To move out of sandbox:
1. Go to SES Console > Account dashboard
2. Click "Request production access"
3. Fill out the request form explaining your use case
4. Wait for AWS approval (usually 24-48 hours)

### Security Best Practices

1. **Use IAM Roles in Production**: Instead of access keys, use IAM roles when deploying to AWS
2. **Rotate Access Keys**: Regularly rotate your AWS access keys
3. **Monitor SES Usage**: Set up CloudWatch alarms for bounce rates and complaints
4. **Configure Bounce and Complaint Handling**: Set up SNS topics to handle bounces and complaints

### Monitoring and Logging

1. **Enable SES Event Publishing**: Track email delivery, bounces, complaints, and clicks
2. **Set up CloudWatch Alarms**: Monitor bounce rates, complaint rates, and reputation
3. **Review Sending Statistics**: Regularly check your sending quota and statistics

## 4. Email Templates Included

The following email templates are implemented:

1. **Welcome Email** (`sendWelcomeEmail`)
   - Sent after successful user registration
   - Includes next steps and login link

2. **Appointment Confirmation** (`sendAppointmentConfirmationEmail`)
   - Sent after biometric appointment booking
   - Includes appointment details and reminders

3. **Appointment Cancellation** (`sendAppointmentCancellationEmail`)
   - Sent after appointment cancellation
   - Includes cancelled appointment details and rescheduling option

## 5. Troubleshooting

### Common Issues

1. **Email not sending**
   - Check AWS credentials in environment variables
   - Verify the FROM email address is verified in SES
   - Check CloudWatch logs for error details

2. **Emails going to spam**
   - Verify your domain with SPF, DKIM, and DMARC records
   - Maintain good sending practices
   - Monitor bounce and complaint rates

3. **Rate limiting errors**
   - Check your SES sending limits
   - Request limit increase if needed
   - Implement exponential backoff for retries

### Useful AWS CLI Commands

```bash
# Check verified identities
aws ses list-verified-email-addresses

# Get sending quota
aws ses get-send-quota

# Get sending statistics
aws ses get-send-statistics
```

## 6. Cost Estimation

AWS SES pricing (as of 2024):
- $0.10 per 1,000 emails sent
- Data transfer charges may apply
- No minimum fees

For a government application like SevisPass, costs should be minimal for typical usage volumes.

---

For more detailed information, refer to the [AWS SES Documentation](https://docs.aws.amazon.com/ses/).