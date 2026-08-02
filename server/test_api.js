require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const token = jwt.sign({ id: 1, email: 'admin@test.com', role: 'admin' }, process.env.JWT_SECRET || 'secret123');
async function run() {
  try {
    const res = await axios.get('http://localhost:3001/api/admin/authors?page=1&limit=5', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(JSON.stringify(res.data.data.map(a => ({ name: a.name, e: a.aggEligibleEvents, p: a.aggParticipatedEvents })), null, 2));
  } catch (e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
run();
