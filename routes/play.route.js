const express = require('express');
const { createConversation, GetAllScore, SummarizeAi } = require('../controllers/play.controller');
const router = express.Router();

router.post('/summarize', SummarizeAi);
router.post('/analyze', createConversation);
router.get('/get-all-score', GetAllScore);
module.exports = router;
