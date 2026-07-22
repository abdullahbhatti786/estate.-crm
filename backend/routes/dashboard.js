const express = require('express');
const Lead = require('../models/Lead');
const Property = require('../models/Property');
const MessageLog = require('../models/MessageLog');
const PaymentInstallment = require('../models/PaymentInstallment');

const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    const role = req.session.user?.role;
    const userId = req.session.user?.id;
    
    let leadQuery = { is_deleted: 0 };
    let propQuery = { is_deleted: 0 };
    let msgQuery = {};

    if (role !== 'admin') {
      leadQuery.created_by = userId;
      propQuery.created_by = userId;
      msgQuery.sent_by = userId;
    }

    const totalLeads = await Lead.countDocuments(leadQuery);
    
    const leadsByStatusRaw = await Lead.aggregate([
      { $match: leadQuery },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    const leadsByStatus = {};
    leadsByStatusRaw.forEach(s => { leadsByStatus[s._id] = s.count; });

    const totalProperties = await Property.countDocuments(propQuery);
    
    const activeLeases = await Property.countDocuments({
      ...propQuery,
      lease_end: { $gte: new Date() }
    });

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const expiringSoonRaw = await Property.find({
      ...propQuery,
      lease_end: { $gte: new Date(), $lte: thirtyDaysFromNow }
    });

    const expiringSoon = expiringSoonRaw.map(p => ({
      ...p.toJSON(),
      daysRemaining: Math.ceil((new Date(p.lease_end) - new Date()) / (1000 * 60 * 60 * 24))
    }));

    const totalMessages = await MessageLog.countDocuments(msgQuery);
    
    const messagesByStatusRaw = await MessageLog.aggregate([
      { $match: msgQuery },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    const messagesByStatus = {};
    messagesByStatusRaw.forEach(s => { messagesByStatus[s._id] = s.count; });

    const recentLeads = await Lead.find(leadQuery)
      .sort({ created_at: -1 })
      .limit(5);

    // Get Upcoming Payments
    const propertyIds = (await Property.find(propQuery).select('_id')).map(p => p._id);
    const upcomingPaymentsRaw = await PaymentInstallment.find({
      property_id: { $in: propertyIds },
      status: { $in: ['Due', 'Overdue'] },
      due_date: { $lte: thirtyDaysFromNow }
    })
    .populate('property_id', 'apartment_unit tenant_name owner_name')
    .sort({ due_date: 1 });

    const upcomingPayments = upcomingPaymentsRaw.map(p => ({
      id: p._id,
      amount: p.amount,
      due_date: p.due_date,
      payment_mode: p.payment_mode,
      status: p.status,
      apartment_unit: p.property_id?.apartment_unit,
      tenant_name: p.property_id?.tenant_name,
      owner_name: p.property_id?.owner_name
    }));

    res.json({
      totalLeads,
      leadsByStatus,
      totalProperties,
      activeLeases,
      expiringSoon,
      expiringSoonCount: expiringSoon.length,
      totalMessages,
      messagesByStatus,
      recentLeads,
      upcomingPayments
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/notifications
router.get('/notifications', async (req, res) => {
  try {
    const role = req.session.user?.role;
    const userId = req.session.user?.id;
    const notifications = [];

    let leadQuery = { is_deleted: 0 };
    let propQuery = { is_deleted: 0 };
    if (role !== 'admin') {
      leadQuery.created_by = userId;
      propQuery.created_by = userId;
    }

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // 1. Expiry Notifications
    const expiringSoon = await Property.find({
      ...propQuery,
      lease_end: { $gte: new Date(), $lte: thirtyDaysFromNow }
    });
    
    expiringSoon.forEach(p => {
      const days = Math.ceil((new Date(p.lease_end) - new Date()) / (1000 * 60 * 60 * 24));
      notifications.push({
        id: `exp-${p._id}`,
        type: days <= 7 ? 'danger' : 'warning',
        title: 'Lease Expiring Soon',
        message: `Unit ${p.apartment_unit} (${p.tenant_name}) lease expires in ${days} days.`,
        date: p.lease_end,
        link: '/properties'
      });
    });

    // 2. Pending Payments
    const propertyIds = (await Property.find(propQuery).select('_id')).map(p => p._id);
    const pendingPayments = await PaymentInstallment.find({
      property_id: { $in: propertyIds },
      status: { $in: ['Due', 'Overdue'] },
      due_date: { $lte: thirtyDaysFromNow }
    }).populate('property_id', 'apartment_unit');

    pendingPayments.forEach(p => {
      notifications.push({
        id: `pay-${p._id}`,
        type: p.status === 'Overdue' ? 'danger' : 'warning',
        title: p.status === 'Overdue' ? 'Overdue Payment' : 'Upcoming Payment',
        message: `Unit ${p.property_id?.apartment_unit} has a ${p.payment_mode} payment of AED ${p.amount.toLocaleString()} due on ${new Date(p.due_date).toLocaleDateString()}.`,
        date: p.due_date,
        link: '/properties'
      });
    });

    // 3. New Leads Notifications
    const newLeads = await Lead.find({ ...leadQuery, status: 'New' });
    newLeads.forEach(l => {
      notifications.push({
        id: `lead-${l._id}`,
        type: 'info',
        title: 'New Uncontacted Lead',
        message: `Lead ${l.name} is waiting to be contacted.`,
        date: l.created_at,
        link: '/leads'
      });
    });

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
