const express = require('express');
const CalendarEvent = require('../models/CalendarEvent');
const Property = require('../models/Property');
const Lead = require('../models/Lead');
const PaymentInstallment = require('../models/PaymentInstallment');

const router = express.Router();

// GET /api/calendar/events - Fetch all events (manual + auto)
router.get('/events', async (req, res) => {
  try {
    const role = req.session.user?.role;
    const userId = req.session.user?.id;

    // 1. Get custom manual events
    let eventQuery = {};
    eventQuery.created_by = userId;
    const rawEvents = await CalendarEvent.find(eventQuery);
    
    const customEvents = rawEvents.map(e => ({
      id: `custom_${e._id}`,
      realId: e._id,
      title: e.title,
      description: e.description,
      date: e.event_date,
      type: e.type, // 'Reminder', 'Meeting', 'Other'
      source: 'custom'
    }));

    let propQuery = { is_deleted: 0 };
    let leadQuery = { is_deleted: 0 };
    propQuery.created_by = userId;
    leadQuery.created_by = userId;

    // 2. Get Lease Expirations
    const properties = await Property.find(propQuery);
    const leaseEvents = properties
      .filter(p => p.lease_end)
      .map(p => ({
        id: `lease_${p._id}`,
        title: `Lease Expires: Unit ${p.apartment_unit}`,
        description: `Tenant: ${p.tenant_name || 'N/A'}\nOwner: ${p.owner_name || 'N/A'}`,
        date: p.lease_end,
        type: 'Lease',
        source: 'auto'
      }));

    // 3. Get Payments
    const paymentEvents = [];
    properties.forEach(p => {
      if (p.payment_schedule && p.payment_schedule.length > 0) {
        p.payment_schedule.forEach((installment, index) => {
          if (installment.status !== 'Paid' && installment.due_date) {
            paymentEvents.push({
              id: `payment_${p._id}_${index}`,
              title: `Rent Due: AED ${installment.amount}`,
              description: `Unit: ${p.apartment_unit}\nTenant: ${p.tenant_name || 'N/A'}\nStatus: ${installment.status}`,
              date: installment.due_date,
              type: 'Rent',
              source: 'auto'
            });
          }
        });
      }
    });

    // 4. Get Lead Follow-ups
    const leads = await Lead.find(leadQuery);
    const leadEvents = leads
      .filter(l => l.follow_up_date)
      .map(l => ({
        id: `lead_${l._id}`,
        title: `Follow-up: ${l.name}`,
        description: `Phone: ${l.phone}\nStatus: ${l.status}`,
        date: l.follow_up_date, 
        type: 'Lead',
        source: 'auto'
      }));

    const allEvents = [...customEvents, ...leaseEvents, ...paymentEvents, ...leadEvents];
    
    // Sort chronologically
    allEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json(allEvents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/calendar/events - Add custom event
router.post('/events', async (req, res) => {
  try {
    const { title, description, event_date, type } = req.body;
    if (!title || !event_date) {
      return res.status(400).json({ error: 'Title and event date are required' });
    }

    const newEvent = await CalendarEvent.create({ 
      title, description, event_date, type, created_by: req.session.user?.id 
    });
    res.status(201).json(newEvent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/calendar/events/:id - Delete custom event
router.delete('/events/:id', async (req, res) => {
  try {
    const event = await CalendarEvent.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    
    if (event.created_by.toString() !== req.session.user?.id.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await CalendarEvent.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
