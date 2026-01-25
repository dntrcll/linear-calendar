import React from 'react';

export default function PrivacyPolicy() {
  const theme = {
    bg: '#ffffff',
    text: '#1a1a1a',
    textSec: '#666666',
    accent: '#F97316',
    border: '#e5e5e5'
  };

  const sectionStyle = {
    marginBottom: '48px'
  };

  const headingStyle = {
    fontSize: '28px',
    fontWeight: 700,
    color: theme.text,
    marginBottom: '16px',
    marginTop: '48px'
  };

  const subHeadingStyle = {
    fontSize: '20px',
    fontWeight: 600,
    color: theme.text,
    marginBottom: '12px',
    marginTop: '32px'
  };

  const paragraphStyle = {
    fontSize: '16px',
    lineHeight: '1.7',
    color: theme.textSec,
    marginBottom: '16px'
  };

  const listStyle = {
    fontSize: '16px',
    lineHeight: '1.7',
    color: theme.textSec,
    marginLeft: '24px',
    marginBottom: '16px'
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.bg,
      padding: '80px 20px 120px'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '60px' }}>
          <div style={{
            display: 'inline-block',
            padding: '8px 16px',
            background: `${theme.accent}15`,
            color: theme.accent,
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            marginBottom: '24px'
          }}>
            Legal
          </div>
          <h1 style={{
            fontSize: '48px',
            fontWeight: 700,
            color: theme.text,
            marginBottom: '16px',
            letterSpacing: '-0.02em'
          }}>
            Privacy Policy
          </h1>
          <p style={{
            fontSize: '18px',
            color: theme.textSec
          }}>
            Last updated: January 25, 2026
          </p>
        </div>

        {/* Introduction */}
        <div style={sectionStyle}>
          <p style={paragraphStyle}>
            Timeline.OS ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.
          </p>
          <p style={paragraphStyle}>
            By using Timeline.OS, you agree to the collection and use of information in accordance with this policy.
          </p>
        </div>

        {/* Information We Collect */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>1. Information We Collect</h2>

          <h3 style={subHeadingStyle}>1.1 Information You Provide</h3>
          <p style={paragraphStyle}>
            When you use Timeline.OS, we collect information that you provide directly:
          </p>
          <ul style={listStyle}>
            <li>Account information (email address, name) via Google OAuth</li>
            <li>Calendar events and timeline data you create</li>
            <li>Tags, categories, and custom settings</li>
            <li>Life metrics data (if you use the Metrics feature)</li>
          </ul>

          <h3 style={subHeadingStyle}>1.2 Automatically Collected Information</h3>
          <p style={paragraphStyle}>
            We may automatically collect certain information when you use our service:
          </p>
          <ul style={listStyle}>
            <li>Device information (browser type, operating system)</li>
            <li>Usage data (features accessed, time spent in app)</li>
            <li>Technical data (IP address, session information)</li>
          </ul>
        </div>

        {/* How We Use Your Information */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>2. How We Use Your Information</h2>
          <p style={paragraphStyle}>
            We use the information we collect to:
          </p>
          <ul style={listStyle}>
            <li>Provide, maintain, and improve Timeline.OS</li>
            <li>Authenticate your account and prevent fraud</li>
            <li>Store and sync your calendar data across devices</li>
            <li>Respond to your comments, questions, and requests</li>
            <li>Send you technical notices and security alerts</li>
            <li>Analyze usage patterns to improve our service</li>
          </ul>
        </div>

        {/* Data Storage */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>3. Data Storage and Security</h2>

          <h3 style={subHeadingStyle}>3.1 Where We Store Your Data</h3>
          <p style={paragraphStyle}>
            Your data is stored securely using Supabase, a trusted cloud database provider. All data is encrypted in transit and at rest.
          </p>

          <h3 style={subHeadingStyle}>3.2 Security Measures</h3>
          <p style={paragraphStyle}>
            We implement appropriate technical and organizational security measures to protect your information, including:
          </p>
          <ul style={listStyle}>
            <li>Encryption of data in transit (HTTPS/TLS)</li>
            <li>Encryption of data at rest</li>
            <li>Row-level security policies in our database</li>
            <li>Regular security audits and updates</li>
            <li>Secure authentication via Google OAuth</li>
          </ul>
        </div>

        {/* Third-Party Services */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>4. Third-Party Services</h2>
          <p style={paragraphStyle}>
            We use the following third-party services:
          </p>
          <ul style={listStyle}>
            <li><strong>Google OAuth:</strong> For authentication (subject to Google's Privacy Policy)</li>
            <li><strong>Supabase:</strong> For secure data storage and database services</li>
            <li><strong>Vercel:</strong> For hosting and content delivery</li>
          </ul>
          <p style={paragraphStyle}>
            These services have their own privacy policies and we encourage you to review them.
          </p>
        </div>

        {/* Data Sharing */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>5. Data Sharing and Disclosure</h2>
          <p style={paragraphStyle}>
            We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
          </p>
          <ul style={listStyle}>
            <li><strong>With your consent:</strong> When you explicitly agree to share information</li>
            <li><strong>Service providers:</strong> With trusted third-party services that help us operate (Supabase, Vercel)</li>
            <li><strong>Legal requirements:</strong> When required by law or to protect our rights</li>
            <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
          </ul>
        </div>

        {/* Your Rights */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>6. Your Rights and Choices</h2>
          <p style={paragraphStyle}>
            You have the following rights regarding your data:
          </p>
          <ul style={listStyle}>
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Correction:</strong> Update or correct your information</li>
            <li><strong>Deletion:</strong> Request deletion of your account and data</li>
            <li><strong>Export:</strong> Download your data in a portable format</li>
            <li><strong>Opt-out:</strong> Decline certain data collection or processing</li>
          </ul>
          <p style={paragraphStyle}>
            To exercise these rights, please contact us at the email address below.
          </p>
        </div>

        {/* Data Retention */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>7. Data Retention</h2>
          <p style={paragraphStyle}>
            We retain your information for as long as your account is active or as needed to provide you services. If you delete your account, we will delete your data within 30 days, except where we are required to retain it for legal purposes.
          </p>
        </div>

        {/* Children's Privacy */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>8. Children's Privacy</h2>
          <p style={paragraphStyle}>
            Timeline.OS is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If you become aware that a child has provided us with personal information, please contact us.
          </p>
        </div>

        {/* International Users */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>9. International Data Transfers</h2>
          <p style={paragraphStyle}>
            Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that are different from the laws of your country. We ensure appropriate safeguards are in place to protect your information.
          </p>
        </div>

        {/* Changes to Policy */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>10. Changes to This Privacy Policy</h2>
          <p style={paragraphStyle}>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
          </p>
          <p style={paragraphStyle}>
            You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
          </p>
        </div>

        {/* Contact */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>11. Contact Us</h2>
          <p style={paragraphStyle}>
            If you have any questions about this Privacy Policy, please contact us:
          </p>
          <div style={{
            background: '#f5f5f5',
            padding: '24px',
            borderRadius: '12px',
            marginTop: '24px'
          }}>
            <p style={{
              fontSize: '16px',
              color: theme.textSec,
              margin: 0
            }}>
              <strong>Email:</strong> privacy@timeline.app<br/>
              <strong>Website:</strong> https://linear-calendar.vercel.app
            </p>
          </div>
        </div>

        {/* Back Link */}
        <div style={{
          marginTop: '80px',
          paddingTop: '40px',
          borderTop: `1px solid ${theme.border}`,
          textAlign: 'center'
        }}>
          <a href="/" style={{
            color: theme.accent,
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '16px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            ← Back to Timeline.OS
          </a>
        </div>
      </div>
    </div>
  );
}
