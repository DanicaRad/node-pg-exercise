const express = require('express');
const slugify = require('slugify');
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
            `SELECT c.code, c.name, c.description,
                i.industry,
                inv.id, inv.amt, inv.paid
                FROM companies AS c
                    LEFT JOIN companies_industries AS ci
                        ON c.code = ci.comp_code
                    LEFT JOIN industries AS i
                        ON ci.ind_code = i.code
                    LEFT JOIN invoices AS inv
                        ON c.code = inv.comp_code
                WHERE c.code= $1`, [req.params.code]
        );


        if(compResult.rowCount === 0) {
            throw new ExpressError(`No such company ${req.params.code} found.`, 404);
        }

        const { code, name, description } = compResult.rows[0];
        const company = {
            "name": name,
            "code": code,
            "description": description,
            "industries": [],
            "invoices": []
        };

        compResult.rows.forEach((r) => {
            if(company.industries.indexOf(r.industry) === -1) {
                company.industries.push(r.industry)
            }
            company.invoices.push({'id': r.id, 'amt': r.amt, 'paid': r.paid})
        })

        return res.json({company: company});
    } 
    catch(err) {
        return next(err);
    }
  });


router.post("", async function(req, res, next) {
    try {
        const { name, description } = req.body;
        const code = slugify(name, {remove: /[*+~.()'"!:@]/g, lower: true});

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
        return res.json({company: result.rows[0]});
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