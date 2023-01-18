module.exports = {
    "env": {
        "browser": true,
        "es2021": true,
        "amd": true,
        "jquery": true
    },
    "extends": "eslint:recommended",
    "overrides": [
    ],
    "parserOptions": {
        "ecmaVersion": "latest",
        "sourceType": "module"
    },
    "rules": {
        "semi": [2, "always"],
    },
    "globals": {
        "ebg": "writable",
        "_": "readonly",
        "toint": "readonly"
    }
};
