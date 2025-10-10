import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface AccountVerifyEmailProps {
  verificationCode?: string;
}

const baseUrl = "https://surkhet.app";

export default function AccountVerifyEmail({
  verificationCode,
}: AccountVerifyEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Preview>SuperSurkhet Email Verification</Preview>
        <Container style={container}>
          {/* Header with centered logo */}
          <Section style={headerSection}>
            <Img
              src={`${baseUrl}/icon.png`}
              width="80"
              height="80"
              alt="SuperSurkhet's Logo"
              style={logo}
            />
          </Section>

          {/* Main content card */}
          <Section style={card}>
            <Heading style={heading}>Verify Your Email Address</Heading>

            <Text style={paragraph}>
              Thank you for creating a SuperSurkhet account. We're excited to have you on board
              and help you digitally empower your business in Surkhet.
            </Text>

            <Text style={paragraph}>
              Please enter the following verification code when prompted to complete your
              registration and gain access to our tools designed to transform your business operations.
            </Text>

            {/* Verification code card */}
            <Section style={verificationCard}>
              <Text style={verificationLabel}>Your Verification Code</Text>
              <Text style={verificationCodeCode}>{verificationCode}</Text>
              <Text style={verificationTime}>
                (This code is valid for 10 minutes)
              </Text>
            </Section>

            <Text style={paragraph}>
              If you didn't create an account, please disregard this message.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>
              SuperSurkhet will never email you asking for your password, credit card,
              or banking information.
            </Text>
            <Hr style={footerDivider} />
            <Text style={footerCopyright}>
              © 2025 SuperSurkhet. Digitally empowering businesses in Surkhet, Nepal.
            </Text>
            <Text style={footerLinks}>
              <Link href="https://surkhet.app/privacy" target="_blank" style={footerLink}>
                Privacy Policy
              </Link>
              {' '} | {' '}
              <Link href="https://surkhet.app/terms" target="_blank" style={footerLink}>
                Terms of Service
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

AccountVerifyEmail.PreviewProps = {
  verificationCode: '596853',
} satisfies AccountVerifyEmailProps;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  maxWidth: '600px',
  margin: '0 auto',
  padding: '20px 0 40px',
};

const headerSection = {
  textAlign: 'center' as const,
  padding: '30px 0',
};

const logo = {
  margin: '0 auto',
};

const card = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  padding: '40px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
  textAlign: 'center' as const,
};

const heading = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  margin: '0 0 20px',
  textAlign: 'center' as const,
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '1.5',
  color: '#333333',
  margin: '0 0 16px',
  textAlign: 'center' as const,
};

const verificationCard = {
  backgroundColor: '#f0f9ff',
  borderRadius: '12px',
  padding: '24px',
  margin: '30px 0',
  border: '1px solid #dbeafe',
};

const verificationLabel = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#4f46e5',
  margin: '0 0 12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const verificationCodeCode = {
  fontSize: '32px',
  fontWeight: 'bold',
  color: '#1e293b',
  margin: '0 0 8px',
  letterSpacing: '4px',
  fontFamily: 'monospace',
};

const verificationTime = {
  fontSize: '14px',
  color: '#64748b',
  margin: '0',
};

const footerSection = {
  marginTop: '40px',
  padding: '0 20px',
  textAlign: 'center' as const,
};

const footerText = {
  fontSize: '12px',
  color: '#6b7280',
  margin: '0 0 16px',
  textAlign: 'center' as const,
};

const footerDivider = {
  borderColor: '#e5e7eb',
  margin: '20px auto',
};

const footerCopyright = {
  fontSize: '12px',
  color: '#6b7280',
  margin: '0 0 12px',
  textAlign: 'center' as const,
};

const footerLinks = {
  fontSize: '12px',
  color: '#6b7280',
  margin: '0',
  textAlign: 'center' as const,
};

const footerLink = {
  color: '#4f46e5',
  textDecoration: 'none',
};