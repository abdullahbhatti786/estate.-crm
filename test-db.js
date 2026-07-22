const { getDb } = require('./backend/config/database');
const Lead = require('./backend/models/Lead');
const Property = require('./backend/models/Property');

try {
  const leads = Lead.getAll({ search: 'asc', limit: 3, page: 1 });
  console.log("LEADS OK", leads);
} catch (err) {
  console.log("LEADS ERROR", err.message);
}

try {
  const props = Property.getAll({ search: 'asc', limit: 3, page: 1 });
  console.log("PROPS OK", props);
} catch (err) {
  console.log("PROPS ERROR", err.message);
}
