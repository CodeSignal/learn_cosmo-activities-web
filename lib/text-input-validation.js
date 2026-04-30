function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = [];

  for (let i = 0; i <= len1; i++) matrix[i] = [i];
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + 1
        );
      }
    }
  }

  return matrix[len1][len2];
}

function calculateSimilarity(str1, str2) {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1.0;
  const distance = levenshteinDistance(str1, str2);
  return 1 - (distance / maxLen);
}

function stripAllWhitespace(s) {
  return String(s).replace(/\s/g, '');
}

function validateTextInputString(userAnswer, correctAnswer, options = {}) {
  const caseSensitive = options.caseSensitive === true;
  const fuzzy = options.fuzzy;
  const ignoreWhitespace = options.ignoreWhitespace === true;

  let user = String(userAnswer).trim();
  let correct = String(correctAnswer).trim();

  if (!caseSensitive) {
    user = user.toLowerCase();
    correct = correct.toLowerCase();
  }

  if (ignoreWhitespace) {
    user = stripAllWhitespace(user);
    correct = stripAllWhitespace(correct);
  }

  if (fuzzy !== false && fuzzy !== undefined) {
    let threshold = fuzzy === true ? 0.8 : parseFloat(fuzzy);
    if (isNaN(threshold) || threshold < 0 || threshold > 1) {
      threshold = 0.8;
    }

    const normalizedUser = user.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
    const normalizedCorrect = correct.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();

    if (normalizedUser === normalizedCorrect) {
      return true;
    }

    const similarity = calculateSimilarity(normalizedUser, normalizedCorrect);
    return similarity >= threshold;
  }

  return user === correct;
}

function validateTextInputNumeric(userAnswer, correctAnswer, options = {}) {
  const threshold = options.threshold !== undefined ? options.threshold : 0.01;
  const precision = options.precision !== undefined ? options.precision : 2;

  const user = parseFloat(userAnswer);
  const correct = parseFloat(correctAnswer);

  if (isNaN(user) || isNaN(correct)) return false;

  const userRounded = Math.round(user * Math.pow(10, precision)) / Math.pow(10, precision);
  const correctRounded = Math.round(correct * Math.pow(10, precision)) / Math.pow(10, precision);

  return Math.abs(userRounded - correctRounded) <= threshold;
}

function validateTextInputNumericWithUnits(userAnswer, correctAnswer, options = {}) {
  const threshold = options.threshold !== undefined ? options.threshold : 0.01;
  const units = options.units || [];

  const escapedUnits = units.map(u => u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const unitsPattern = escapedUnits.length > 0 ? escapedUnits.join('|') : '';

  let userStr = String(userAnswer).trim();
  if (unitsPattern) {
    const unitRegex = new RegExp(`^\\s*(${unitsPattern})\\s*|\\s*(${unitsPattern})\\s*$`, 'gi');
    userStr = userStr.replace(unitRegex, '').trim();
  }

  let correctStr = String(correctAnswer).trim();
  if (unitsPattern) {
    const unitRegex = new RegExp(`^\\s*(${unitsPattern})\\s*|\\s*(${unitsPattern})\\s*$`, 'gi');
    correctStr = correctStr.replace(unitRegex, '').trim();
  }

  userStr = userStr.replace(',', '.');
  correctStr = correctStr.replace(',', '.');

  const userValue = parseFloat(userStr);
  const correctValue = parseFloat(correctStr);

  if (isNaN(userValue) || isNaN(correctValue)) return false;
  return Math.abs(userValue - correctValue) <= threshold;
}

function validateTextInputNumericWithCurrency(userAnswer, correctAnswer, options = {}) {
  const threshold = options.threshold !== undefined ? options.threshold : 0.01;
  const currency = options.currency !== undefined ? options.currency : '$';
  const escapedCurrency = currency.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  let userStr = String(userAnswer).trim();
  userStr = userStr.replace(new RegExp(`^\\s*${escapedCurrency}\\s*|\\s*${escapedCurrency}\\s*$`, 'g'), '').trim();

  let correctStr = String(correctAnswer).trim();
  correctStr = correctStr.replace(new RegExp(`^\\s*${escapedCurrency}\\s*|\\s*${escapedCurrency}\\s*$`, 'g'), '').trim();

  userStr = userStr.replace(',', '.');
  correctStr = correctStr.replace(',', '.');

  const userValue = parseFloat(userStr);
  const correctValue = parseFloat(correctStr);

  if (isNaN(userValue) || isNaN(correctValue)) return false;
  return Math.abs(userValue - correctValue) <= threshold;
}

function parseOptionsText(optionsText) {
  const options = {};
  if (!optionsText) return options;

  const optionPairs = optionsText.split(',');
  optionPairs.forEach(pair => {
    const [key, value] = pair.split('=').map(s => s.trim());
    if (key && value !== undefined) {
      if (value === 'true') {
        options[key] = true;
      } else if (value === 'false') {
        options[key] = false;
      } else if (!isNaN(value)) {
        options[key] = parseFloat(value);
      } else {
        options[key] = value;
      }
    }
  });

  return options;
}

function parseValidationOptions(answerText) {
  const trimmedAnswer = String(answerText || '').trim();
  const startsWithKind = trimmedAnswer.startsWith('[kind:');
  let validationMatch;

  if (startsWithKind) {
    validationMatch = trimmedAnswer.match(/^\[kind:\s*([^\]]+)\](?:\s+\[options:\s*([^\]]+)\])?$/);
    if (validationMatch) {
      const kind = validationMatch[1] ? validationMatch[1].trim() : 'string';
      const optionsText = validationMatch[2] ? validationMatch[2].trim() : '';
      const options = parseOptionsText(optionsText);
      if (kind === 'numeric-with-units' && typeof options.units === 'string') {
        options.units = options.units.split(',').map(u => u.trim()).filter(Boolean);
      }
      return {
        correctAnswer: '',
        validation: { kind, options }
      };
    }
  } else {
    validationMatch = trimmedAnswer.match(/^(.+?)(?:\s+\[kind:\s*([^\]]+)\])?(?:\s+\[options:\s*([^\]]+)\])?$/);
  }

  if (!validationMatch) {
    return { correctAnswer: trimmedAnswer, validation: {} };
  }

  const correctAnswer = validationMatch[1].trim();
  const kind = validationMatch[2] ? validationMatch[2].trim() : 'string';
  const optionsText = validationMatch[3] ? validationMatch[3].trim() : '';
  const options = parseOptionsText(optionsText);

  if (kind === 'numeric-with-units' && typeof options.units === 'string') {
    options.units = options.units.split(',').map(u => u.trim()).filter(Boolean);
  }

  return {
    correctAnswer,
    validation: { kind, options }
  };
}

function parseTextInputAnswerItems(answerItems) {
  const parsedAnswers = (answerItems || [])
    .map(item => parseValidationOptions(item))
    .filter(entry => {
      const hasAnswerText = String(entry.correctAnswer || '').trim().length > 0;
      const isValidateLater = entry.validation && entry.validation.kind === 'validate-later';
      return hasAnswerText || isValidateLater;
    });

  if (parsedAnswers.length === 0) {
    return { correctAnswers: [], correctAnswer: '', validation: {} };
  }

  return {
    correctAnswers: parsedAnswers.map(entry => ({
      correctAnswer: entry.correctAnswer,
      validation: entry.validation || {}
    })),
    correctAnswer: parsedAnswers[0].correctAnswer,
    validation: parsedAnswers[0].validation || {}
  };
}

function getTextInputValidationCandidates(question) {
  const candidates = Array.isArray(question.correctAnswers) && question.correctAnswers.length > 0
    ? question.correctAnswers
    : [{ correctAnswer: question.correctAnswer, validation: question.validation || {} }];

  return candidates
    .map(candidate => {
      if (typeof candidate === 'string') {
        return { correctAnswer: candidate, validation: question.validation || {} };
      }
      return {
        correctAnswer: candidate.correctAnswer || '',
        validation: candidate.validation || question.validation || {}
      };
    })
    .filter(candidate => {
      const kind = candidate.validation && candidate.validation.kind;
      if (kind === 'validate-later') return true;
      return String(candidate.correctAnswer || '').trim().length > 0;
    });
}

function validateTextInputAnswer(question, userAnswer) {
  const candidates = getTextInputValidationCandidates(question);
  const scorableCandidates = candidates.filter(c => (c.validation?.kind || '') !== 'validate-later');

  if (scorableCandidates.length === 0) {
    return userAnswer && userAnswer.trim() ? null : false;
  }

  if (!userAnswer || !userAnswer.trim()) {
    return false;
  }

  return scorableCandidates.some(candidate => {
    const validation = candidate.validation || {};
    const options = validation.options || {};

    switch (validation.kind) {
      case 'string':
        return validateTextInputString(userAnswer, candidate.correctAnswer, options);
      case 'numeric':
        return validateTextInputNumeric(userAnswer, candidate.correctAnswer, options);
      case 'numeric-with-units':
        return validateTextInputNumericWithUnits(userAnswer, candidate.correctAnswer, options);
      case 'numeric-with-currency':
        return validateTextInputNumericWithCurrency(userAnswer, candidate.correctAnswer, options);
      default:
        return validateTextInputString(userAnswer, candidate.correctAnswer, { caseSensitive: false });
    }
  });
}

module.exports = {
  levenshteinDistance,
  calculateSimilarity,
  stripAllWhitespace,
  validateTextInputString,
  validateTextInputNumeric,
  validateTextInputNumericWithUnits,
  validateTextInputNumericWithCurrency,
  parseValidationOptions,
  parseTextInputAnswerItems,
  getTextInputValidationCandidates,
  validateTextInputAnswer
};
