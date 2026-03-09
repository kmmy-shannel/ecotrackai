const pool=require('./src/config/database');
const bcrypt=require('bcryptjs');
const axios=require('axios');

(async()=>{
  try{
    const res = await pool.query('SELECT password_hash FROM users WHERE email=$1',['superadmin@ecotrackai.com']);
    console.log('hash row',res.rows);
    if(res.rows.length>0){
      const match = await bcrypt.compare('YourPasswordHere', res.rows[0].password_hash);
      console.log('bcrypt match?', match);
    }
  }catch(err){
    console.error('db error',err);
  }

  try{
    const r = await axios.post('http://localhost:5000/auth/login', { email:'superadmin@ecotrackai.com', password:'YourPasswordHere' });
    console.log('login response', r.status, r.data);
  } catch(e) {
    console.error('login request error', e.response ? e.response.status : e.message, e.response ? e.response.data : '');
  }
  process.exit(0);
})();