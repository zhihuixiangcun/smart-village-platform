#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

class SecurityAudit {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.passed = [];
  }

  // Check environment variables security
  checkEnvironmentVariables() {
    console.log('\n🔍 Checking Environment Variables Security...\n');

    const requiredVars = [
      'NODE_ENV',
      'JWT_SECRET',
      'MONGO_URI',
      'REDIS_HOST'
    ];

    const sensitiveVars = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'MONGO_URI',
      'REDIS_PASSWORD',
      'SESSION_SECRET',
      'ENCRYPTION_KEY'
    ];

    // Check for required variables
    requiredVars.forEach(envVar => {
      if (!process.env[envVar]) {
        this.issues.push(`Missing required environment variable: ${envVar}`);
      } else {
        this.passed.push(`✓ ${envVar} is set`);
      }
    });

    // Check sensitive variable strength
    sensitiveVars.forEach(envVar => {
      const value = process.env[envVar];
      if (value) {
        if (value.length < 32) {
          this.warnings.push(`Weak secret detected for ${envVar} (should be at least 32 characters)`);
        } else if (value === 'default' || value === 'secret') {
          this.issues.push(`Default or weak secret detected for ${envVar}`);
        }
      }
    });

    // Check for exposed secrets in .env file
    try {
      const envContent = fs.readFileSync('.env', 'utf8');
      const lines = envContent.split('\n');

      lines.forEach((line, index) => {
        if (line.includes('password') || line.includes('secret') || line.includes('key')) {
          if (line.split('=').length > 1 && !line.includes('#')) {
            this.warnings.push(`Potential secret in .env at line ${index + 1}: ${line.split('=')[0]}`);
          }
        }
      });
    } catch (error) {
      this.warnings.push('Could not read .env file');
    }
  }

  // Check file permissions
  checkFilePermissions() {
    console.log('\n🔍 Checking File Permissions...\n');

    const sensitiveFiles = [
      '.env',
      'config/production.json',
      'ssl/private.key',
      'ssl/certificate.crt'
    ];

    sensitiveFiles.forEach(file => {
      if (fs.existsSync(file)) {
        try {
          const stats = fs.statSync(file);
          const mode = (stats.mode & parseInt('777', 8)).toString(8);

          if (mode !== '600' && mode !== '640') {
            this.warnings.push(`${file} has permissive permissions: ${mode} (should be 600 or 640)`);
          } else {
            this.passed.push(`✓ ${file} has secure permissions: ${mode}`);
          }
        } catch (error) {
          this.warnings.push(`Could not check permissions for ${file}`);
        }
      }
    });

    // Check for world-writable files
    try {
      const output = execSync('find . -type f -perm /002 2>/dev/null', { encoding: 'utf8' });
      if (output.trim()) {
        this.issues.push('World-writable files detected:\n' + output);
      }
    } catch (error) {
      // No world-writable files found
    }
  }

  // Check dependencies for known vulnerabilities
  checkDependencies() {
    console.log('\n🔍 Checking Dependencies for Vulnerabilities...\n');

    try {
      // Run npm audit
      const auditOutput = execSync('npm audit --json', { encoding: 'utf8' });
      const auditResult = JSON.parse(auditOutput);

      if (auditResult.vulnerabilities) {
        Object.entries(auditResult.vulnerabilities).forEach(([name, vuln]) => {
          if (vuln.severity === 'high' || vuln.severity === 'critical') {
            this.issues.push(`Security vulnerability in ${name}: ${vuln.title} (${vuln.severity})`);
          } else if (vuln.severity === 'moderate') {
            this.warnings.push(`Security vulnerability in ${name}: ${vuln.title} (${vuln.severity})`);
          }
        });
      }

      if (auditResult.metadata && auditResult.metadata.vulnerabilities) {
        const { total, high, moderate, low, info } = auditResult.metadata.vulnerabilities;

        if (high > 0 || critical > 0) {
          this.issues.push(`${high} high and ${critical || 0} critical vulnerabilities found`);
        } else if (moderate > 0) {
          this.warnings.push(`${moderate} moderate vulnerabilities found`);
        } else {
          this.passed.push('✓ No high or critical vulnerabilities found');
        }
      }
    } catch (error) {
      this.warnings.push('Could not run npm audit');
    }
  }

  // Check security headers implementation
  checkSecurityHeaders() {
    console.log('\n🔍 Checking Security Headers Implementation...\n');

    const securityHeaders = [
      'helmet',
      'x-frame-options',
      'x-content-type-options',
      'x-xss-protection',
      'strict-transport-security'
    ];

    securityHeaders.forEach(header => {
      try {
        const files = execSync(`grep -r "${header}" --include="*.js" --include="*.ts" src/ 2>/dev/null`, { encoding: 'utf8' });
        if (files.trim()) {
          this.passed.push(`✓ ${header} security header implemented`);
        } else {
          this.warnings.push(`${header} security header not found`);
        }
      } catch (error) {
        this.warnings.push(`${header} security header not implemented`);
      }
    });
  }

  // Check authentication and authorization
  checkAuthentication() {
    console.log('\n🔍 Checking Authentication & Authorization...\n');

    // Check for JWT implementation
    try {
      const jwtFiles = execSync('grep -r "jsonwebtoken" --include="*.js" --include="*.ts" src/ 2>/dev/null', { encoding: 'utf8' });
      if (jwtFiles.trim()) {
        this.passed.push('✓ JWT authentication implemented');
      } else {
        this.warnings.push('JWT authentication not found');
      }
    } catch (error) {
      this.warnings.push('JWT authentication not implemented');
    }

    // Check for password hashing
    try {
      const bcryptFiles = execSync('grep -r "bcrypt" --include="*.js" --include="*.ts" src/ 2>/dev/null', { encoding: 'utf8' });
      if (bcryptFiles.trim()) {
        this.passed.push('✓ Password hashing implemented');
      } else {
        this.issues.push('Password hashing not implemented');
      }
    } catch (error) {
      this.issues.push('Password hashing not implemented');
    }

    // Check for rate limiting
    try {
      const rateLimitFiles = execSync('grep -r "rate.limit" --include="*.js" --include="*.ts" src/ 2>/dev/null', { encoding: 'utf8' });
      if (rateLimitFiles.trim()) {
        this.passed.push('✓ Rate limiting implemented');
      } else {
        this.warnings.push('Rate limiting not implemented');
      }
    } catch (error) {
      this.warnings.push('Rate limiting not implemented');
    }
  }

  // Check input validation and sanitization
  checkInputValidation() {
    console.log('\n🔍 Checking Input Validation & Sanitization...\n');

    const securityPackages = [
      'express-validator',
      'express-mongo-sanitize',
      'xss',
      'dompurify',
      'validator'
    ];

    securityPackages.forEach(pkg => {
      try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        if (packageJson.dependencies && packageJson.dependencies[pkg]) {
          this.passed.push(`✓ ${pkg} for input validation/sanitization`);
        } else if (packageJson.devDependencies && packageJson.devDependencies[pkg]) {
          this.passed.push(`✓ ${pkg} for input validation/sanitization`);
        } else {
          this.warnings.push(`${pkg} not installed for input validation`);
        }
      } catch (error) {
        this.warnings.push(`Could not check for ${pkg}`);
      }
    });
  }

  // Check database security
  checkDatabaseSecurity() {
    console.log('\n🔍 Checking Database Security...\n');

    // Check for MongoDB security best practices
    try {
      const files = fs.readdirSync('src/models');
      files.forEach(file => {
        if (file.endsWith('.js')) {
          const content = fs.readFileSync(`src/models/${file}`, 'utf8');

          if (content.includes('new Schema')) {
            // Check for timestamps
            if (content.includes('timestamps: true')) {
              this.passed.push(`✓ ${file} has timestamps`);
            } else {
              this.warnings.push(`${file} missing timestamps`);
            }

            // Check for version key
            if (content.includes('versionKey: false')) {
              this.passed.push(`✓ ${file} has versionKey disabled`);
            }
          }
        }
      });
    } catch (error) {
      this.warnings.push('Could not check database models');
    }

    // Check for database connection security
    try {
      const dbFiles = execSync('grep -r "mongodb.connect" --include="*.js" --include="*.ts" src/ 2>/dev/null', { encoding: 'utf8' });
      if (dbFiles.includes('ssl=true') || dbFiles.includes('ssl: true')) {
        this.passed.push('✓ Database connection uses SSL');
      } else {
        this.warnings.push('Database connection may not use SSL');
      }
    } catch (error) {
      this.warnings.push('Could not verify database connection security');
    }
  }

  // Check for secrets in code
  checkForSecrets() {
    console.log('\n🔍 Checking for Secrets in Code...\n');

    const secretPatterns = [
      /password\s*=\s*["'][^"']+["']/,
      /secret\s*=\s*["'][^"']+["']/,
      /api_key\s*=\s*["'][^"']+["']/,
      /token\s*=\s*["'][^"']+["']/,
      /private_key\s*=\s*["'][^"']+["']/,
      /aws_access_key_id\s*=\s*["'][^"']+["']/,
      /aws_secret_access_key\s*=\s*["'][^"']+["']/
    ];

    const filesToCheck = [
      'src/**/*.js',
      'src/**/*.ts',
      'config/**/*.js',
      'server/**/*.js'
    ];

    filesToCheck.forEach(pattern => {
      try {
        const files = execSync(`find . -path './${pattern}' 2>/dev/null`, { encoding: 'utf8' }).split('\n');

        files.forEach(file => {
          if (file && fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8');

            secretPatterns.forEach((regex, index) => {
              if (regex.test(content)) {
                const line = content.split('\n').findIndex(l => regex.test(l));
                this.issues.push(`Potential secret detected in ${file} at line ${line + 1}`);
              }
            });
          }
        });
      } catch (error) {
        // File pattern not found
      }
    });
  }

  // Check HTTPS configuration
  checkHTTPSConfiguration() {
    console.log('\n🔍 Checking HTTPS Configuration...\n');

    // Check for SSL/TLS certificates
    const certPaths = [
      'ssl/server.crt',
      'ssl/private.key',
      'config/ssl/cert.pem',
      'config/ssl/key.pem'
    ];

    const certsFound = certPaths.filter(path => fs.existsSync(path));

    if (certsFound.length > 0) {
      this.passed.push('✓ SSL/TLS certificates found');
    } else {
      this.warnings.push('SSL/TLS certificates not found');
    }

    // Check for HTTPS redirect middleware
    try {
      const httpsRedirect = execSync('grep -r "https.redirect" --include="*.js" --include="*.ts" src/ 2>/dev/null', { encoding: 'utf8' });
      if (httpsRedirect.includes('true')) {
        this.passed.push('✓ HTTPS redirect middleware implemented');
      } else {
        this.warnings.push('HTTPS redirect middleware not found');
      }
    } catch (error) {
      this.warnings.push('HTTPS redirect middleware not implemented');
    }
  }

  // Generate security score
  calculateSecurityScore() {
    const totalChecks = this.issues.length + this.warnings.length + this.passed.length;
    const passedScore = this.passed.length * 10;
    const warningScore = this.warnings.length * 2;
    const issueScore = this.issues.length * 5;

    const maxScore = totalChecks * 10;
    const currentScore = maxScore - issueScore - warningScore;
    const percentage = Math.round((currentScore / maxScore) * 100);

    return {
      score: percentage,
      grade: this.getGrade(percentage),
      summary: {
        passed: this.passed.length,
        warnings: this.warnings.length,
        issues: this.issues.length,
        total: totalChecks
      }
    };
  }

  getGrade(percentage) {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  }

  // Generate report
  generateReport() {
    const score = this.calculateSecurityScore();

    console.log('\n' + '='.repeat(60));
    console.log('📊 SECURITY AUDIT REPORT');
    console.log('='.repeat(60));
    console.log(`\nSecurity Score: ${score.score}% (Grade: ${score.grade})`);
    console.log(`\nSummary:`);
    console.log(`  ✓ Passed: ${score.summary.passed}`);
    console.log(`  ⚠ Warnings: ${score.summary.warnings}`);
    console.log(`  ❌ Issues: ${score.summary.issues}`);
    console.log(`  📊 Total Checks: ${score.summary.total}`);

    if (this.issues.length > 0) {
      console.log('\n❌ CRITICAL ISSUES (Must Fix):');
      this.issues.forEach(issue => console.log(`   - ${issue}`));
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS (Should Fix):');
      this.warnings.forEach(warning => console.log(`   - ${warning}`));
    }

    if (this.passed.length > 0) {
      console.log('\n✅ PASSED CHECKS:');
      this.passed.slice(0, 10).forEach(passed => console.log(`   ${passed}`));
      if (this.passed.length > 10) {
        console.log(`   ... and ${this.passed.length - 10} more`);
      }
    }

    console.log('\n📋 RECOMMENDATIONS:');
    if (score.grade === 'A') {
      console.log('   Excellent security posture! Continue monitoring and regular audits.');
    } else if (score.grade === 'B') {
      console.log('   Good security posture. Address warnings to improve to A grade.');
    } else if (score.grade === 'C') {
      console.log('   Moderate security posture. Address issues and warnings promptly.');
    } else {
      console.log('   Poor security posture. Immediate action required to fix critical issues.');
    }

    // Save report to file
    const reportData = {
      timestamp: new Date().toISOString(),
      score: score,
      issues: this.issues,
      warnings: this.warnings,
      passed: this.passed
    };

    fs.writeFileSync('security-audit-report.json', JSON.stringify(reportData, null, 2));
    console.log('\n📄 Detailed report saved to: security-audit-report.json');
  }

  // Run all security checks
  async runAudit() {
    console.log('🚀 Starting Smart Village Platform Security Audit...\n');

    this.checkEnvironmentVariables();
    this.checkFilePermissions();
    this.checkDependencies();
    this.checkSecurityHeaders();
    this.checkAuthentication();
    this.checkInputValidation();
    this.checkDatabaseSecurity();
    this.checkForSecrets();
    this.checkHTTPSConfiguration();

    this.generateReport();

    // Exit with error code if critical issues found
    if (this.issues.length > 0) {
      process.exit(1);
    }
  }
}

// Run audit if executed directly
if (require.main === module) {
  const audit = new SecurityAudit();
  audit.runAudit().catch(error => {
    console.error('Audit failed:', error);
    process.exit(1);
  });
}

module.exports = SecurityAudit;