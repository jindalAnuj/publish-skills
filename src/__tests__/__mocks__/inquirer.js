module.exports = {
  select: async (options) => {
    return options.choices[0].value;
  },
  input: async (options) => {
    return options.default || 'test-input';
  },
  confirm: async (options) => {
    return options.default || false;
  },
  checkbox: async (options) => {
    return [];
  },
  password: async (options) => {
    return 'password';
  },
  customType: async (options) => {
    return null;
  },
};
