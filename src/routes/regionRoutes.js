const express = require('express');
const router = express.Router();
const regionController = require('../controllers/regionController');

router.get('/provinces', regionController.getProvinces);

router.get('/province/:provinceCode/cities', regionController.getCities);

router.get('/province/:provinceCode/city/:cityCode/districts', regionController.getDistricts);

router.get('/province/:provinceCode/city/:cityCode/district/:districtCode/townships', regionController.getTownships);

router.get('/province/:provinceCode/city/:cityCode/district/:districtCode/township/:townshipCode/villages', regionController.getVillages);

router.get('/code/:code', regionController.searchByCode);

router.get('/search', regionController.searchByName);

router.get('/path/:code', regionController.getFullRegionPath);

router.get('/statistics', regionController.getStatistics);

router.get('/geocode', regionController.getGeocode);

module.exports = router;
