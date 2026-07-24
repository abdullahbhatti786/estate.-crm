const mongoose = require('mongoose');
const Property = require('../models/Property');
const PaymentInstallment = require('../models/PaymentInstallment');
require('dotenv').config({ path: '../.env' });

async function syncPayments() {
  try {
    console.log('Connecting to DB...');
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log('Connected. Emptying existing PaymentInstallments...');
    await PaymentInstallment.deleteMany({});
    
    const properties = await Property.find({});
    console.log(`Found ${properties.length} properties.`);
    
    let totalInstallments = 0;
    
    for (const prop of properties) {
      if (prop.payment_schedule && Array.isArray(prop.payment_schedule) && prop.payment_schedule.length > 0) {
        const installments = prop.payment_schedule.map(p => ({
          property_id: prop._id,
          amount: p.amount || prop.rent_amount,
          due_date: new Date(p.date || new Date()),
          payment_mode: p.mode || 'Cheque',
          status: p.status || 'Due'
        }));
        
        await PaymentInstallment.insertMany(installments);
        totalInstallments += installments.length;
        console.log(`Added ${installments.length} installments for property ${prop.apartment_unit}`);
      }
    }
    
    console.log(`Done! Synced ${totalInstallments} total installments.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

syncPayments();
