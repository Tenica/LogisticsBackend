const express = require('express');
const isAuth = require('../middleware/is-auth');
const { createCustomer, getCustomersByAdmin, updateCustomer, getCustomerById, getDeletedCustomers, deleteCustomer, restoreCustomer } = require('../controllers/customer');
const router = express.Router();

// CREATE a new customer
router.post('/create-customer', isAuth, createCustomer)

// ✅ Get all deleted customers
router.get('/delete-customers', isAuth, getDeletedCustomers);

// ✅ Restore deleted customer (and their shipments)
router.put('/restore/:id', isAuth, restoreCustomer);


// (Optional) GET a single customer by ID (only if not deleted)
router.get('/viewcustomer/:id', isAuth, getCustomerById);



// EDIT (update) a customer by ID
router.put('/:id', isAuth, updateCustomer);

// DELETE (soft delete) a customer by ID
router.delete('/delete-customer/:id', isAuth, deleteCustomer);


// GET all customers for a particular admin (excluding deleted ones)
router.get('/getAllCustomers', isAuth, getCustomersByAdmin);









module.exports = router;





