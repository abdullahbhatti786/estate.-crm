const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });
const PaymentInstallment = require('../models/PaymentInstallment');
const Property = require('../models/Property');

mongoose.connect(process.env.MONGO_URI || "mongodb+srv://abdullah009bhatti_db_user:GY6zeLQpNkoeppYU@cluster0.j3ddlli.mongodb.net/estate_crm?retryWrites=true&w=majority&appName=Cluster0")
.then(async () => {
  console.log('Connected.');
  const res = await PaymentInstallment.updateMany({status: 'Pending'}, {status: 'Due'});
  console.log('Fixed installments:', res.modifiedCount);
  
  const props = await Property.find();
  let c = 0;
  for (let p of props) {
    if (p.payment_schedule && p.payment_schedule.length > 0) {
      let changed = false;
      p.payment_schedule.forEach(x => {
        if (x.status === 'Pending') {
          x.status = 'Due';
          changed = true;
        }
      });
      if (changed) {
        p.markModified('payment_schedule');
        await p.save();
        c++;
      }
    }
  }
  console.log('Fixed properties:', c);
  process.exit(0);
})
.catch(err => {
  console.error(err);
  process.exit(1);
});
