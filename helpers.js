const getUserByEmail = (email, users) => {
  for (user in users) {
    if (users[user].email === email) {
      return user;
    }
  }
  return undefined;
}

module.exports.getUserByEmail = getUserByEmail;