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
        return res.json({invoice: result.rows[0]});
    } 
    catch(err) {
        return next(err);
    }
});

router.post("", async function(req, res, next) {
    try {
        if(Object.keys(req.body).indexOf("comp_code") === -1 || Object.keys(req.body).indexOf("amt") === -1) {
            throw new ExpressError(`Missing or invalid request keys. Must include 'comp_code' and 'amt'.`, 400);
        };

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

        if(err.detail) {
            if(err.detail.toLowerCase().includes("key")) {
                next(new ExpressError(`'${req.body.comp_code}' is not a valid company code.`, 400));
            };
        };
        return next(err);
    };
});

router.put("/:id", async function (req, res, next) {
    try {
        const { amt, paid } = req.body;
        let paidDate = null;

        const result = await db.query(
            `SELECT *
            FROM invoices
            WHERE id=$1`,
            [req.params.id]);

        if(result.rowCount === 0) {
            throw new ExpressError(`No such invoice ID ${req.params.id} found.`, 404);
        }

        const inv = result.rows[0];
        if(!inv.paid_date && paid) {
            paidDate = new Date();
        } else if (!paid) {
            paidDate = null;
        } else {
            paidDate = inv.paid_date;
        }

        const newResult = await db.query(
            `UPDATE invoices as inv 
            SET amt=$1, paid=$2, paid_date=$3
            WHERE id=$4
            RETURNING
            id, comp_code, amt, paid, add_date, paid_date`,
            [amt, paid, paidDate, req.params.id]
        );

        return res.json({invoice: newResult.rows[0]});
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
            throw new ExpressError(`No such invoice ID ${req.params.id} found.`, 404);
        }
        return res.json({status: "deleted"});
    } 
    catch(err) {
        return next(err);
    }
});

module.exports = router;