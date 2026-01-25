import React from 'react';

export default function TermsOfService() {
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
            Terms of Service
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
            Welcome to Timeline.OS. These Terms of Service ("Terms") govern your access to and use of our application. By accessing or using Timeline.OS, you agree to be bound by these Terms.
          </p>
          <p style={paragraphStyle}>
            Please read these Terms carefully before using our service. If you do not agree to these Terms, you may not use Timeline.OS.
          </p>
        </div>

        {/* Acceptance of Terms */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>1. Acceptance of Terms</h2>
          <p style={paragraphStyle}>
            By creating an account, accessing, or using Timeline.OS, you agree to:
          </p>
          <ul style={listStyle}>
            <li>Comply with these Terms of Service</li>
            <li>Comply with our Privacy Policy</li>
            <li>Comply with all applicable laws and regulations</li>
            <li>Be at least 13 years of age (or the age of majority in your jurisdiction)</li>
          </ul>
        </div>

        {/* Description of Service */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>2. Description of Service</h2>
          <p style={paragraphStyle}>
            Timeline.OS is a calendar and timeline management application that helps you organize events, track goals, and manage your schedule. The service includes:
          </p>
          <ul style={listStyle}>
            <li>Event creation and management</li>
            <li>Calendar views (year, month, week, day)</li>
            <li>Tags and categorization</li>
            <li>Life metrics tracking</li>
            <li>Timers and productivity tools</li>
            <li>Data synchronization across devices</li>
          </ul>
          <p style={paragraphStyle}>
            We reserve the right to modify, suspend, or discontinue any part of the service at any time with or without notice.
          </p>
        </div>

        {/* User Accounts */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>3. User Accounts</h2>

          <h3 style={subHeadingStyle}>3.1 Account Creation</h3>
          <p style={paragraphStyle}>
            To use Timeline.OS, you must create an account using Google OAuth. You agree to:
          </p>
          <ul style={listStyle}>
            <li>Provide accurate and complete information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Notify us immediately of any unauthorized access</li>
            <li>Be responsible for all activities under your account</li>
          </ul>

          <h3 style={subHeadingStyle}>3.2 Account Termination</h3>
          <p style={paragraphStyle}>
            You may delete your account at any time through the app settings. We reserve the right to suspend or terminate accounts that violate these Terms or engage in prohibited activities.
          </p>
        </div>

        {/* User Content */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>4. User Content and Data</h2>

          <h3 style={subHeadingStyle}>4.1 Your Content</h3>
          <p style={paragraphStyle}>
            You retain all rights to the content you create in Timeline.OS (events, notes, metrics, etc.). By using our service, you grant us a license to store, process, and display your content solely for the purpose of providing the service.
          </p>

          <h3 style={subHeadingStyle}>4.2 Content Responsibility</h3>
          <p style={paragraphStyle}>
            You are solely responsible for your content. You agree not to upload or create content that:
          </p>
          <ul style={listStyle}>
            <li>Violates any laws or regulations</li>
            <li>Infringes on intellectual property rights</li>
            <li>Contains malware or harmful code</li>
            <li>Is defamatory, offensive, or harassing</li>
            <li>Violates the privacy rights of others</li>
          </ul>

          <h3 style={subHeadingStyle}>4.3 Data Backup</h3>
          <p style={paragraphStyle}>
            While we implement backup procedures, you are responsible for maintaining your own backup copies of important data. We are not liable for any loss of data.
          </p>
        </div>

        {/* Acceptable Use */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>5. Acceptable Use Policy</h2>
          <p style={paragraphStyle}>
            You agree not to:
          </p>
          <ul style={listStyle}>
            <li>Use the service for any illegal purpose</li>
            <li>Attempt to gain unauthorized access to our systems</li>
            <li>Interfere with or disrupt the service</li>
            <li>Use automated tools to access the service without permission</li>
            <li>Reverse engineer or decompile any part of the service</li>
            <li>Share your account credentials with others</li>
            <li>Use the service to spam or harass others</li>
            <li>Attempt to bypass security measures</li>
          </ul>
        </div>

        {/* Intellectual Property */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>6. Intellectual Property</h2>

          <h3 style={subHeadingStyle}>6.1 Our Property</h3>
          <p style={paragraphStyle}>
            Timeline.OS, including its design, features, code, and branding, is owned by us and protected by intellectual property laws. You may not copy, modify, or create derivative works without our permission.
          </p>

          <h3 style={subHeadingStyle}>6.2 Trademarks</h3>
          <p style={paragraphStyle}>
            "Timeline.OS" and our logo are our trademarks. You may not use them without our written consent.
          </p>
        </div>

        {/* Payment and Pricing */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>7. Pricing and Payment</h2>
          <p style={paragraphStyle}>
            Timeline.OS is currently offered free of charge. We reserve the right to introduce paid features or subscriptions in the future with advance notice to users.
          </p>
          <p style={paragraphStyle}>
            If we introduce paid features:
          </p>
          <ul style={listStyle}>
            <li>Pricing will be clearly displayed before purchase</li>
            <li>Payments will be processed securely through trusted providers</li>
            <li>Refund policies will be clearly stated</li>
            <li>You may cancel subscriptions at any time</li>
          </ul>
        </div>

        {/* Disclaimers */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>8. Disclaimers and Warranties</h2>
          <p style={paragraphStyle}>
            <strong>Timeline.OS is provided "AS IS" and "AS AVAILABLE" without warranties of any kind.</strong>
          </p>
          <p style={paragraphStyle}>
            We do not guarantee that:
          </p>
          <ul style={listStyle}>
            <li>The service will be uninterrupted or error-free</li>
            <li>Defects will be corrected</li>
            <li>The service is free from viruses or harmful components</li>
            <li>Results from using the service will meet your expectations</li>
          </ul>
          <p style={paragraphStyle}>
            You use the service at your own risk. We are not responsible for any data loss, missed appointments, or other consequences of using the service.
          </p>
        </div>

        {/* Limitation of Liability */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>9. Limitation of Liability</h2>
          <p style={paragraphStyle}>
            To the maximum extent permitted by law, we shall not be liable for:
          </p>
          <ul style={listStyle}>
            <li>Indirect, incidental, or consequential damages</li>
            <li>Loss of profits, data, or business opportunities</li>
            <li>Damages resulting from your use or inability to use the service</li>
            <li>Damages from unauthorized access to your data</li>
            <li>Damages from third-party content or services</li>
          </ul>
          <p style={paragraphStyle}>
            Our total liability shall not exceed the amount you paid us in the 12 months before the claim (currently $0 for free users).
          </p>
        </div>

        {/* Indemnification */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>10. Indemnification</h2>
          <p style={paragraphStyle}>
            You agree to indemnify and hold us harmless from any claims, damages, losses, or expenses (including legal fees) arising from:
          </p>
          <ul style={listStyle}>
            <li>Your use of the service</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any rights of others</li>
            <li>Your content or data</li>
          </ul>
        </div>

        {/* Third-Party Services */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>11. Third-Party Services</h2>
          <p style={paragraphStyle}>
            Timeline.OS integrates with third-party services (Google OAuth, Supabase, etc.). Your use of these services is subject to their respective terms and privacy policies. We are not responsible for third-party services.
          </p>
        </div>

        {/* Changes to Terms */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>12. Changes to These Terms</h2>
          <p style={paragraphStyle}>
            We may modify these Terms at any time. We will notify you of material changes by:
          </p>
          <ul style={listStyle}>
            <li>Posting the updated Terms on this page</li>
            <li>Updating the "Last updated" date</li>
            <li>Sending an email notification (for significant changes)</li>
          </ul>
          <p style={paragraphStyle}>
            Your continued use of Timeline.OS after changes become effective constitutes acceptance of the updated Terms.
          </p>
        </div>

        {/* Governing Law */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>13. Governing Law and Disputes</h2>
          <p style={paragraphStyle}>
            These Terms are governed by the laws of [Your Jurisdiction], without regard to conflict of law principles. Any disputes shall be resolved through binding arbitration or in the courts of [Your Jurisdiction].
          </p>
        </div>

        {/* Severability */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>14. Severability</h2>
          <p style={paragraphStyle}>
            If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full effect.
          </p>
        </div>

        {/* Contact */}
        <div style={sectionStyle}>
          <h2 style={headingStyle}>15. Contact Information</h2>
          <p style={paragraphStyle}>
            If you have questions about these Terms, please contact us:
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
              <strong>Email:</strong> legal@timeline.app<br/>
              <strong>Website:</strong> https://linear-calendar.vercel.app
            </p>
          </div>
        </div>

        {/* Acknowledgment */}
        <div style={{
          background: `${theme.accent}08`,
          border: `2px solid ${theme.accent}30`,
          borderRadius: '12px',
          padding: '32px',
          marginTop: '60px'
        }}>
          <p style={{
            fontSize: '16px',
            fontWeight: 600,
            color: theme.text,
            marginBottom: '12px'
          }}>
            Acknowledgment
          </p>
          <p style={{
            fontSize: '15px',
            lineHeight: '1.7',
            color: theme.textSec,
            margin: 0
          }}>
            By using Timeline.OS, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
          </p>
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
