# AWS Rekognition & Textract Setup Guide

This guide will help you set up AWS Rekognition and Textract for real AI-powered face verification and document OCR in your SevisPass application.

## Prerequisites

- AWS Account (sign up at https://aws.amazon.com)
- Basic understanding of AWS services
- Administrative access to your AWS account

## Step 1: Create AWS Account

1. Go to https://aws.amazon.com
2. Click "Create an AWS Account"
3. Follow the registration process
4. Verify your account with a credit card (AWS Free Tier available)

## Step 2: Create IAM User for SevisPass

1. Go to AWS Console → IAM → Users
2. Click "Add users"
3. Enter username: `sevispass-app`
4. Select "Programmatic access"
5. Click "Next: Permissions"

## Step 3: Attach Required Policies

Create a custom policy with these permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "rekognition:CompareFaces",
                "rekognition:DetectFaces",
                "rekognition:DetectModerationLabels",
                "textract:DetectDocumentText",
                "textract:AnalyzeDocument"
            ],
            "Resource": "*"
        }
    ]
}
```

**Or use AWS managed policies:**
- `AmazonRekognitionFullAccess` (or create restricted version)
- `AmazonTextractFullAccess` (or create restricted version)

## Step 4: Get Access Keys

1. After creating the user, download the CSV with:
   - Access Key ID
   - Secret Access Key
2. **IMPORTANT**: Store these securely - they won't be shown again

## Step 5: Configure Your Application

1. Open your `.env` file
2. Uncomment and fill in the AWS credentials:

```env
# AWS Configuration
AWS_ACCESS_KEY_ID=your_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_secret_access_key_here
AWS_REGION=us-east-1
```

## Step 6: Test Configuration

1. Start your development server: `npm run dev`
2. Try to register a new user with face verification
3. Check the console logs for AWS service messages

## Regional Considerations

### Supported Regions for Rekognition:
- US East (N. Virginia) - `us-east-1` ✅ **Recommended**
- US West (Oregon) - `us-west-2`
- Europe (Ireland) - `eu-west-1`
- Asia Pacific (Tokyo) - `ap-northeast-1`

### Supported Regions for Textract:
- US East (N. Virginia) - `us-east-1` ✅ **Recommended**
- US West (Oregon) - `us-west-2`
- Europe (Ireland) - `eu-west-1`

## Cost Considerations

### AWS Free Tier (First 12 months):
- **Rekognition**: 5,000 images/month for face analysis
- **Textract**: 1,000 pages/month for document analysis

### After Free Tier:
- **Rekognition**: ~$0.001 per face comparison
- **Textract**: ~$0.0015 per page for document text detection

### Estimated costs for 1000 users/month:
- Face verifications: ~$1-2/month
- Document processing: ~$1.50/month
- **Total: ~$3-4/month**

## Security Best Practices

### 1. Least Privilege Access
Only grant the minimum required permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "rekognition:CompareFaces",
                "rekognition:DetectFaces",
                "textract:DetectDocumentText"
            ],
            "Resource": "*"
        }
    ]
}
```

### 2. Environment Variables
- Never commit AWS keys to version control
- Use environment variables or AWS IAM roles
- Consider AWS Secrets Manager for production

### 3. Key Rotation
- Rotate access keys every 90 days
- Monitor usage in CloudTrail
- Set up billing alerts

## Troubleshooting

### Common Issues:

1. **"AWS credentials not configured"**
   - Check `.env` file has correct variable names
   - Restart your development server after changes

2. **"Access Denied" errors**
   - Verify IAM policy permissions
   - Check if services are available in your region

3. **"Region not supported"**
   - Use `us-east-1` for maximum service availability
   - Update `AWS_REGION` in your `.env` file

4. **High costs**
   - Monitor usage in AWS Cost Explorer
   - Set up billing alerts
   - Consider caching results for repeated requests

## Production Deployment

### For Vercel/Netlify:
Add environment variables in your deployment platform:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`

### For AWS EC2/Lambda:
- Use IAM roles instead of access keys
- Attach policies directly to the service role
- More secure than hardcoded credentials

## Monitoring and Logging

1. Enable CloudTrail for API call logging
2. Set up CloudWatch alarms for unusual usage
3. Monitor costs with billing alerts

## Alternative Services

If AWS costs are too high, consider:
- **Azure Cognitive Services** - Similar capabilities
- **Google Cloud Vision API** - Good OCR capabilities
- **OpenCV + TensorFlow** - Self-hosted solution
- **Face-api.js** - Client-side face detection

## Support

For issues with this setup:
1. Check AWS documentation
2. Review CloudTrail logs for API errors
3. Contact AWS support for service-specific issues

---

**Note**: Without AWS credentials, SevisPass will automatically fall back to simulation mode for development and testing.