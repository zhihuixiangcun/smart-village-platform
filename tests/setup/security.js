// Security test setup
require('../setup');

// Security testing utilities
global.securityTestHelpers = {
  // SQL injection payloads
  sqlInjectionPayloads: [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "' UNION SELECT * FROM users --",
    "admin'--",
    "' OR 1=1#",
    "'; EXEC xp_cmdshell('dir'); --"
  ],

  // XSS payloads
  xssPayloads: [
    "<script>alert('xss')</script>",
    "javascript:alert('xss')",
    "<img src=x onerror=alert('xss')>",
    "';alert('xss');//",
    "<svg onload=alert('xss')>",
    "';document.location='http://evil.com';//"
  ],

  // Path traversal payloads
  pathTraversalPayloads: [
    "../../../etc/passwd",
    "..\\..\\..\\windows\\system32\\config\\sam",
    "....//....//....//etc/passwd",
    "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
    "..%252f..%252f..%252fetc%252fpasswd"
  ],

  // Command injection payloads
  commandInjectionPayloads: [
    "; ls -la",
    "| cat /etc/passwd",
    "& echo 'command injection'",
    "`whoami`",
    "$(id)",
    "; rm -rf /"
  ],

  // NoSQL injection payloads
  noSqlInjectionPayloads: [
    {"$ne": null},
    {"$gt": ""},
    {"$regex": ".*"},
    {"$where": "return true"},
    {"$json": {"$ne": null}}
  ]
};

// Test for common vulnerabilities
global.testSecurityVulnerability = async (endpoint, method, payloads, field = 'input') => {
  const results = [];

  for (const payload of payloads) {
    const response = await global.api[method.toLowerCase()](endpoint)
      .send({ [field]: payload })
      .expect(400);

    results.push({
      payload,
      status: response.status,
      success: response.body.success === false,
      message: response.body.message
    });
  }

  return results;
};

// Authentication bypass test helper
global.testAuthenticationBypass = async (protectedEndpoint) => {
  const responses = [
    await global.api.get(protectedEndpoint), // No token
    await global.api.get(protectedEndpoint).set('Authorization', ''), // Empty token
    await global.api.get(protectedEndpoint).set('Authorization', 'Bearer invalid'), // Invalid token
    await global.api.get(protectedEndpoint).set('Authorization', 'invalid'), // Malformed header
  ];

  // All should return 401 or 403
  responses.forEach(response => {
    expect([401, 403]).toContain(response.status);
  });

  return responses;
};

// JWT token manipulation test
global.testJWTManipulation = async (endpoint, validToken) => {
  const manipulations = [
    validToken.slice(0, -10), // Truncated token
    validToken + 'a', // Appended character
    validToken.replace(/./g, 'a'), // All characters replaced
    Buffer.from(validToken).toString('base64'), // Wrong encoding
  ];

  const results = [];
  for (const manipulatedToken of manipulations) {
    const response = await global.api
      .get(endpoint)
      .set('Authorization', `Bearer ${manipulatedToken}`);

    results.push({
      token: manipulatedToken.substring(0, 20) + '...',
      status: response.status,
      success: response.body.success === false
    });
  }

  return results;
};