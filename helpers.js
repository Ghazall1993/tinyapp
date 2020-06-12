const getUserByEmail = (email, users) => {
  for (user in users) {
    if (users[user].email === email) {
      return user;
    }
  }
  return false;
}

module.exports.getUserByEmail = getUserByEmail;