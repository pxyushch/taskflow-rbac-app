
const auditLog = (action, details) => {
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({ timestamp, action, details }));
};

module.exports = { auditLog };
