const express = require('express');
const db = require("../db");
const ExpressError = require('../expressError');

const router = express.Router();

router.get("", async function(req, res, next) {
    try {
        const result = await db.query(
            `SELECT i.industry, c.comp_code
                FROM industries AS i
                    RIGHT JOIN companies_industries AS c
                    ON i.code = c.ind_code`
        );

        const industries = [];
        const ind = new Set(result.rows.map(r => r.industry))
        
        ind.forEach(i => industries.push({"industry": i, "companies": result.rows.map((r) => {
            if(r.industry === i) {
                return r.comp_code
            }
        })}));

        industries.forEach(i => i.companies = i.companies.filter(c => c));

        return res.json({industries});

    } catch(err) {
        next(err);
    }
});

router.post("", async function(req, res, next) {
    // Creates new industry
    try {
        const {code, industry} = req.body;

        if(!code || !industry) {
            throw new ExpressError(`Request missing "code" or "industry" keys`, 400);
        }

        const result = await db.query(
            `INSERT INTO industries (code, industry)
            VALUES ($1, $2)
            RETURNING code, industry`, 
            [code, industry]
        );
        return res.status(201).json({industry: result.rows[0]});
    } catch(err) {
        next(err);
    }
})

router.post("/:code", async function(req, res, next) {
    // Creates new company industry relationship
    try {
        if(!req.body.comp_code) {
            throw new ExpressError(`Request missing "comp_code" key.`, 400)
        };

        const result = await db.query(
            `INSERT INTO companies_industries (comp_code, ind_code)
                VALUES ($1, $2)
                RETURNING ind_code, comp_code`,
                [req.body.comp_code, req.params.code]
        );

        if(result.rowCount === 0) {
            throw new ExpressError("Company or industry not found.", 404)
        }
        return res.json({"company industry": result.rows[0]});

    } catch(err) {
        if(err.detail) {
            next(new ExpressError(`Invalid company code or indusrtry code: ${err.detail.replace(`\".`, ".").replace("\"", "")}`, 400));
        }
        next(err);
    }
});

module.exports = router;
