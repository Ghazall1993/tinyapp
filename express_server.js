const express = require("express");
const app = express();
const PORT = 8080; // default port 8080
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser')
const bcrypt = require('bcrypt');

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser())

const urlDatabase = {
  b6UTxQ: { longURL: "https://www.tsn.ca", userID: "aJ48lW" },
  i3BoGr: { longURL: "https://www.google.ca", userID: "aJ48lW" }
};

const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur"
  },
}

//return userID if it finds a user corresponds to the email
const findUserByEmail = email => {
  for (user in users) {
    if (users[user].email === email) {
      return user;
    }
  }
  return false;
}

//returns the URLs where the userID is equal to the id of the currently logged-in user.
const urlsForUser = id => {
  const result = {};
  for (url in urlDatabase) {
    if (urlDatabase[url].userID === id) {
      result[url] = urlDatabase[url];
    }
  }
  return result;
}

app.get("/urls", (req, res) => {
  const userId = req.cookies.user_id;
  let templateVars = { urls: urlsForUser(userId), user: users[userId] };
  res.render("urls_index", templateVars);
});

app.get("/urls/new", (req, res) => {
  if (req.cookies.user_id) {
    let templateVars = { user: users[req.cookies.user_id] };
    res.render("urls_new", templateVars);
  } else {
    res.redirect("/login");
  }
});

app.get("/urls/:shortURL", (req, res) => {
  if (req.cookies.user_id) {
    const shortURL = req.params.shortURL;
    let templateVars = { shortURL: shortURL, longURL: urlDatabase[shortURL].longURL, user: users[req.cookies.user_id] };
    res.render("urls_show", templateVars)
  } else {
    res.redirect("/urls");
  }
})

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL].longURL;
  res.redirect(longURL);
})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

app.post("/urls", (req, res) => {
  const longURL = req.body.longURL;
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = {
    longURL,
    userID: req.cookies.user_id,
  };
  res.redirect(`/urls/${shortURL}`);
});
//POST /urls/:shortURL/delete
app.post("/urls/:shortURL/delete", (req, res) => {
  if (req.cookies.user_id) {
    const shortURL = req.params.shortURL;
    delete urlDatabase[shortURL];
    res.redirect("/urls");
  } else {
    res.redirect("/urls")
  }
})

app.post("/urls/:shortURL", (req, res) => {
  if (req.cookies.user_id) {
    let editShort = req.params.shortURL;
    urlDatabase[editShort].longURL = req.body.editted;
    res.redirect("/urls");
  } else {
    res.redirect("/urls");
  }
});

app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const userID = findUserByEmail(email);
  if (!userID) {
    res.status(403).send("User does not exists!");
  } else {
    if (bcrypt.compareSync(password, users[userID].password)) {
      res.cookie("user_id", userID);
      res.redirect("/urls");
    } else {
      res.status(403).send("Incorrect password!");
    }
  }
})

app.get("/login", (req, res) => {
  res.render("login");
})

app.post("/logout", (req, res) => {
  res.clearCookie("user_id");
  res.redirect("/urls");
})

app.get("/register", (req, res) => {
  res.render("register");
})

app.post("/register", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const hashedPassword = bcrypt.hashSync(password, 10);
  if (((email.length === 0) && (password.length === 0))) {
    res.status(400).send("Invalid Email or Password!");
  } else if (findUserByEmail(email)) {
    res.status(400).send("Email already exists!");
  }
  const id = generateRandomString();
  users[id] = {
    id,
    email,
    password : hashedPassword,
  }
  res.cookie("user_id", id);
  res.redirect("/urls");
})

function generateRandomString() {
  return Math.random().toString(36).substr(2, 6);
}