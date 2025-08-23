# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of SuperSurkhet seriously. If you believe you have found a security vulnerability in our platform, we encourage you to let us know right away.

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them by emailing our security team at security@supersurkhet.com.

Please include the following information in your report:
- Type of issue (e.g. buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit the issue

## Security Measures

SuperSurkhet implements several security measures to protect user data:

1. **Decentralized Data Architecture**: Using GunDB to ensure users retain control of their data
2. **End-to-End Encryption**: For sensitive data transmission
3. **Authentication Security**: Secure OAuth implementation with Google
4. **Input Validation**: Zod schema validation for all data inputs
5. **Regular Security Audits**: Periodic review of code and dependencies
6. **Dependency Management**: Regular updates of dependencies with security patches

## Best Practices

We follow these security best practices:
- Regular security training for contributors
- Code review process for all changes
- Automated security scanning in CI/CD pipeline
- Principle of least privilege for data access
- Secure coding practices as outlined in our contribution guidelines

Thank you for helping keep SuperSurkhet and its users safe!