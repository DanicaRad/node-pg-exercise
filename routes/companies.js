const express = require('express');
const db = require("../db");
const ExpressError = require('../expressError');

const router = express.Router();

router.get("", async function (req, res, next) {
    try {
        const result = await db.query(`SELECT * FROM companies`);
        return res.json({companies: result.rows});
    } 
    catch(err) {
        return next(err);
    }
});

router.get("/:code", async function (req, res, next) {
    try {
        const compResult = await db.query(
            `SELECT * FROM companies
            WHERE code= $1`, [req.params.code]
        );
        const invResult = await db.query(
            `SELECT * FROM invoices
            WHERE comp_Code= $1`, [req.params.code]
        )
        if(compResult.rowCount === 0) {
            throw new ExpressError(`No such company ${req.params.code} found.`, 404);
        }

        const company = compResult.rows[0];
        const invoices = invResult.rows;

        company.invoices = invoices;
        return res.json({company: company});
    } 
    catch(err) {
        return next(err);
    }
  });


router.post("", async function(req, res, next) {
    try {
        const {code, name, description } = req.body;

        const result = await db.query(
            `INSERT INTO companies (code, name, description)
            VALUES ($1, $2, $3)
            RETURNING code, name, description`,
            [code, name, description]
        );
        return res.status(201).json({company: result.rows[0]});

    } catch(err) {
        return next(err);
    }
})

router.put("/:code", async function (req, res, next) {
    try {
        const { name, description } = req.body;

        const result = await db.query(
            `UPDATE companies SET name=$1, description=$2
            WHERE code = $3
            RETURNING code, name, description`,
            [name, description, req.params.code]
        );
        if(result.rowCount === 0) {
            throw new ExpressError(`No such company ${req.params.code} found.`, 404);
        }
        console.log("RESULT.ROWS", result.rows);
        return res.json({company: result.rows});
    } 
    catch(err) {
        return next(err);
    }
});

router.delete("/:code", async function (req, res, next) {
    try {

        const result = await db.query(
            `DELETE FROM companies
            WHERE code = $1`,
            [req.params.code]
        );
        if(result.rowCount === 0) {
            throw new ExpressError(`No such company ${req.params.code} found.`, 404);
        }
        return res.json({status: "deleted"});
    } 
    catch(err) {
        return next(err);
    }
});

module.exports = router;