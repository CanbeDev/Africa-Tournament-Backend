const { check, body, param } = require('express-validator');

const idPattern = /^[a-zA-Z0-9_-]+$/;
const countryPattern = /^[A-Za-z\s'.-]{2,}$/;

const userRegisterValidator = [
  check('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  check('password')
    .isStrongPassword({ minLength: 8, minNumbers: 1, minUppercase: 1 })
    .withMessage('Password must be at least 8 characters and include uppercase letters and numbers'),
  check('role')
    .isIn(['admin', 'federation_rep', 'viewer'])
    .withMessage('Role must be admin, federation_rep, or viewer'),
  check('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  check('country')
    .optional()
    .trim()
    .matches(countryPattern)
    .withMessage('Valid country name is required'),
  check('federation')
    .optional()
    .trim()
    .isLength({ min: 2, max: 150 })
    .withMessage('Federation must be between 2 and 150 characters'),
];

const userLoginValidator = [
  check('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  check('password').isString().withMessage('Password is required').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
];

const teamRegistrationValidator = [
  body('federation').trim().isLength({ min: 2, max: 150 }).withMessage('Federation is required'),
  body('country').trim().matches(countryPattern).withMessage('Valid African country is required'),
  body('manager').trim().isLength({ min: 2, max: 150 }).withMessage('Manager name is required'),
  body('players')
    .isArray({ min: 23, max: 23 })
    .withMessage('Players must be an array of exactly 23 entries'),
  body('players.*.name')
    .isString()
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('Player name must be between 2 and 80 characters'),
  body('players.*.position')
    .isIn(['GK', 'DF', 'MD', 'AT'])
    .withMessage('Player position must be one of GK, DF, MD, AT'),
  body('players.*.isCaptain')
    .isBoolean()
    .withMessage('isCaptain must be a boolean value')
    .toBoolean(),
];

const teamSquadUpdateValidator = [
  param('id').matches(idPattern).withMessage('Valid team ID is required'),
  body('players')
    .isArray({ min: 23, max: 23 })
    .withMessage('Players must be an array of exactly 23 entries'),
  body('players.*.name')
    .isString()
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('Player name must be between 2 and 80 characters'),
  body('players.*.position')
    .isIn(['GK', 'DF', 'MD', 'AT'])
    .withMessage('Player position must be one of GK, DF, MD, AT'),
  body('players.*.isCaptain')
    .isBoolean()
    .withMessage('isCaptain must be a boolean value')
    .toBoolean(),
];

const teamReactivateValidator = [
  param('id').matches(idPattern).withMessage('Valid team ID is required'),
];

const matchSimulationValidator = [
  body('matchId')
    .optional()
    .matches(idPattern)
    .withMessage('matchId must be a valid identifier'),
  body('homeTeam')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('homeTeam must be a valid team name'),
  body('awayTeam')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('awayTeam must be a valid team name'),
  body('stage')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Stage must be between 2 and 100 characters'),
  body()
    .custom((value) => {
      if (!value.matchId && (!value.homeTeam || !value.awayTeam)) {
        throw new Error('Either matchId must be provided or both homeTeam and awayTeam are required');
      }
      return true;
    }),
];

const matchPlayValidator = [
  body('matchId')
    .matches(idPattern)
    .withMessage('matchId must be a valid identifier'),
];

const adminCreateUserValidator = [
  check('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  check('password')
    .isStrongPassword({ minLength: 8, minNumbers: 1 })
    .withMessage('Password must be at least 8 characters and include numeric characters'),
  check('role')
    .isIn(['admin', 'federation_rep', 'viewer'])
    .withMessage('Role must be admin, federation_rep, or viewer'),
  check('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  check('country')
    .optional()
    .trim()
    .matches(countryPattern)
    .withMessage('Valid country name is required'),
  check('federation')
    .optional()
    .trim()
    .isLength({ min: 2, max: 150 })
    .withMessage('Federation must be between 2 and 150 characters'),
];

const adminBulkDeleteValidator = [
  body('teamIds')
    .isArray({ min: 1 })
    .withMessage('teamIds must be a non-empty array'),
  body('teamIds.*')
    .matches(idPattern)
    .withMessage('Each teamId must be a valid identifier'),
];

module.exports = {
  userRegisterValidator,
  userLoginValidator,
  teamRegistrationValidator,
  teamSquadUpdateValidator,
  teamReactivateValidator,
  matchSimulationValidator,
  matchPlayValidator,
  adminCreateUserValidator,
  adminBulkDeleteValidator,
};

