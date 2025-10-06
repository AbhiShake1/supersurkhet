import {
    Body,
    Button,
    Container,
    Head,
    Hr,
    Html,
    Img,
    Preview,
    Section,
    Text,
} from '@react-email/components';

interface WelcomeEmailProps {
    userFirstname: string;
}

const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : '';

export const WelcomeEmail = ({
    userFirstname,
}: WelcomeEmailProps) => (
    <Html>
        <Head />
        <Body style={main}>
            <Preview>
                Welcome to SuperSurkhet! We're excited to have you on board.
            </Preview>
            <Container style={container}>
                <Img
                    src={`${baseUrl}/icon.png`}
                    width="50"
                    height="50"
                    alt="SuperSurkhet"
                    style={logo}
                />
                <Text style={paragraph}>Hi {userFirstname},</Text>
                <Text style={paragraph}>
                    Welcome to SuperSurkhet, the platform designed to digitally empower businesses in Surkhet, Nepal. 
                    We're thrilled to have you join our mission to transform the local business ecosystem through innovative digital solutions.
                </Text>
                <Section style={btnContainer}>
                    <Button style={button} href={`${baseUrl}/dashboard`}>
                        Access Your Business Dashboard
                    </Button>
                </Section>
                <Text style={paragraph}>
                    Best,
                    <br />
                    The SuperSurkhet team
                </Text>
                <Hr style={hr} />
                <Text style={footer}>
                    Empowering Local Businesses in Surkhet, Nepal
                </Text>
            </Container>
        </Body>
    </Html>
);

WelcomeEmail.PreviewProps = {
    userFirstname: 'Abhi',
} as WelcomeEmailProps;

export default WelcomeEmail;

const main = {
    backgroundColor: '#ffffff',
    fontFamily:
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
    margin: '0 auto',
    padding: '20px 0 48px',
};

const logo = {
    margin: '0 auto',
};

const paragraph = {
    fontSize: '16px',
    lineHeight: '26px',
};

const btnContainer = {
    textAlign: 'center' as const,
};

const button = {
    backgroundColor: '#5F51E8',
    borderRadius: '3px',
    color: '#fff',
    fontSize: '16px',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'block',
    padding: '12px',
};

const hr = {
    borderColor: '#cccccc',
    margin: '20px 0',
};

const footer = {
    color: '#8898aa',
    fontSize: '12px',
};