import * as React from 'react';

interface InvitationEmailProps {
  inviterName: string;
  businessName: string;
  inviteeEmail: string;
  role: string;
  invitationUrl: string;
}

export const InvitationEmail = ({
  inviterName,
  businessName,
  inviteeEmail,
  role,
  invitationUrl
}: InvitationEmailProps) => (
  <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
    <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
      <h1 style={{ color: '#0f172a', marginBottom: '10px' }}>Organization Invitation</h1>
      <p style={{ color: '#64748b', marginBottom: '20px' }}>
        You have been invited to join an organization
      </p>
    </div>

    <div style={{ padding: '20px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
      <p style={{ color: '#334155', marginBottom: '15px' }}>
        Hi {inviteeEmail},
      </p>
      <p style={{ color: '#334155', marginBottom: '15px' }}>
        <strong>{inviterName}</strong> has invited you to join <strong>{businessName}</strong> as a <strong>{role}</strong>.
      </p>
      <p style={{ color: '#334155', marginBottom: '20px' }}>
        Click the button below to accept the invitation and join the organization.
      </p>

      <div style={{ textAlign: 'center', margin: '25px 0' }}>
        <a 
          href={invitationUrl}
          style={{
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            padding: '12px 24px',
            textDecoration: 'none',
            borderRadius: '6px',
            display: 'inline-block',
            fontWeight: 'bold'
          }}
        >
          Accept Invitation
        </a>
      </div>

      <p style={{ color: '#334155', marginBottom: '15px' }}>
        If you don't want to accept this invitation, you can simply ignore this email.
      </p>

      <p style={{ color: '#334155', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
        Best regards,<br />
        The SuperSurkhet Team
      </p>
    </div>

    <div style={{ textAlign: 'center', marginTop: '20px', color: '#94a3b8', fontSize: '12px' }}>
      <p>This email was sent to {inviteeEmail} because you were invited to join {businessName}.</p>
    </div>
  </div>
);

export default InvitationEmail;