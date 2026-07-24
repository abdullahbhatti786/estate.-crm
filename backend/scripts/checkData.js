require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Property = require('../models/Property');
const PaymentInstallment = require('../models/PaymentInstallment');

mongoose.connect(process.env.MONGO_URI || "mongodb+srv://abdullah009bhatti_db_user:GY6zeLQpNkoeppYU@cluster0.j3ddlli.mongodb.net/estate_crm?retryWrites=true&w=majority&appName=Cluster0")
.then(async () => {
  const props = await Property.find();
  console.log("Total Properties:", props.length);
  props.forEach(p => {
    console.log("Property", p.apartment_unit, "payments length:", p.payment_schedule?.length);
    if(p.payment_schedule?.length > 0) {
      console.log(p.payment_schedule[0]);
    }
  });
  
  const payments = await PaymentInstallment.find();
  console.log("\nTotal Installments in DB:", payments.length);
  if(payments.length > 0) {
      console.log("First installment sample:", payments[0]);
  }
  process.exit(0);
})
.catch(err => {
  console.error(err);
  process.exit(1);
});
