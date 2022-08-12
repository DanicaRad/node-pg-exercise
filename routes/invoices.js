const express = require('express');
const db = require("../db");
const ExpressError = require('../expressError');

const router = express.Router();

router.get("", async function (req, res, next) {
    try {
        const result = await db.query(`SELECT * FROM invoices`);
        return res.json({invoices: result.rows});
    } 
    catch(err) {
        return next(err);
    }
});

router.get("/:id", async function (req, res, next) {
    try {
        const result = await db.query(
            `SELECT *
            FROM invoices
            WHERE id= $1`, [req.params.id]
        );
        if(result.rowCount === 0) {
            throw new ExpressError(`No such invoice ID ${req.params.id} found.`, 404);
        }
        return res.json({invoice: result.rows});
    } 
    catch(err) {
        return next(err);
    }
});

router.post("", async function(req, res, next) {
    try {
        const {comp_code, amt } = req.body;

        const result = await db.query(
            `INSERT INTO invoices (comp_code, amt)
            VALUES ($1, $2)
            RETURNING
            id, comp_code, amt, paid, add_date, paid_date`,
            [comp_code, amt]
        );
        return res.status(201).json({invoice: result.rows[0]});

    } catch(err) {
        return next(err);
    }
});

router.put("/:id", async function (req, res, next) {
    try {
        const { amt } = req.body;

        const result = await db.query(
            `UPDATE invoices SET amt=$1
            WHERE id = $2
            RETURNING
            id, comp_code, amt, paid, add_date, paid_date`,
            [amt, req.params.id]
        );
        if(result.rowCount === 0) {
            throw new ExpressError(`No such invoice ID ${req.params.id} found.`, 404);
        }
        console.log("RESULT.ROWS", result.rows);
        return res.json({invoice: result.rows});
    } 
    catch(err) {
        return next(err);
    }
});

router.delete("/:id", async function (req, res, next) {
    try {

        const result = await db.query(
            `DELETE FROM invoices
            WHERE id = $1`,
            [req.params.id]
        );
        if(result.rowCount === 0) {
            throw new ExpressError(`No such invoice ID ${req.params.code} found.`, 404);
        }
        return res.json({status: "deleted"});
    } 
    catch(err) {
        return next(err);
    }
});

module.exports = router;