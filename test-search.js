const axios = require('axios');
async function test() {
  try {
    const res = await axios.get('http://localhost:5000/api/leads?search=test');
    console.log("SUCCESS:", res.data);
  } catch (err) {
    console.log("ERROR:", err.response ? err.response.data : err.message);
  }
}
test();
