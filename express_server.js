const express = require("express");
const app = express();
const PORT = 8080; // default port 8080
const bodyParser = require("body-parser");
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');
const helpers = require("./helpers");

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieSession({
  name: 'session',
  keys: ["gbefwbiuelrlgburegbukb"],
}));

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
};

//returns the URLs where the userID is equal to the id of the currently logged-in user
const urlsForUser = id => {
  const result = {};
  for (let url in urlDatabase) {
    if (urlDatabase[url].userID === id) {
      result[url] = urlDatabase[url];
    }
  }
  return result;
};

// If the user is logged in, returns a table of URLs the user has created with edit and delete options
app.get("/urls", (req, res) => {
  const userId = req.session.user_id;
  if (userId) {
    let templateVars = { urls: urlsForUser(userId), user: users[userId] };
    res.render("urls_index", templateVars);
  } else {
    res.render("please_login", { user: undefined });
  }
});

// Returns a form so that the user can enter a long URL and submit it in order to create a short URL (when the user is logged in)
app.get("/urls/new", (req, res) => {
  if (req.session.user_id) {
    let templateVars = { user: users[req.session.user_id] };
    res.render("urls_new", templateVars);
  } else {
    res.redirect("/login");
  }
});

// Returns the page that lets the logged in users to edit the long URL they created
app.get("/urls/:shortURL", (req, res) => {
  const userId = req.session.user_id;
  if (userId) {
    // User logged in
    const shortURL = req.params.shortURL;
    const url = urlDatabase[shortURL];
    if (url) {
      if (url.userID === userId) {
        // Owned by the currnet user
        let templateVars = { shortURL: shortURL, longURL: urlDatabase[shortURL].longURL, user: users[userId] };
        res.render("urls_show", templateVars);
      } else {
        // Not owned by the currnet user
        res.render("access_denied");
      }
    } else {
      // URL not found in DB
      res.render("not_found");
    }
  } else {
    // User not logged in
    res.render("please_login", { user: undefined });
  }
});

// Redirect to main page for logged in users, and for other users redirect to login page
app.get("/", (req, res) => {
  if (req.session.user_id) {
    res.redirect("/urls");
  } else {
    res.redirect("/login");
  }
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

// Redirects to the corresponding long URL, if URL for the given ID exists
app.get("/u/:shortURL", (req, res) => {
  const shortURL = req.params.shortURL;
  const url = urlDatabase[shortURL];
  if (url) {
    const longURL = urlDatabase[req.params.shortURL].longURL;
    res.redirect(longURL);
  } else {
    res.render("not_found");
  }
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

// Generates a short URL, saves it, and associates it with the user if the user is logged in
app.post("/urls", (req, res) => {
  const userId = req.session.user_id;
  // Check if the user is logged in
  if (userId) {
    const longURL = req.body.longURL;
    const shortURL = generateRandomString();
    urlDatabase[shortURL] = {
      longURL,
      userID: req.session.user_id,
    };
    res.redirect(`/urls/${shortURL}`);
  } else {
    res.render("cannot_create_url", { val: "create a short URL" });
  }
});

// If the user is logged in and owns the URL for the given ID, delete the URL and redirect to main page (/urls)
app.post("/urls/:shortURL/delete", (req, res) => {
  if (req.session.user_id) {
    const shortURL = req.params.shortURL;
    if (urlDatabase[shortURL]) {
      delete urlDatabase[shortURL];
      res.redirect("/urls");
    } else {
      res.render("cannot_create_url", { val: "delete the URL that you have not created" });
    }
  } else {
    res.redirect("/access_denied");
  }
});

// If user is logged in and owns the URL for the given ID, updates the URL and redirect to main page (/urls)
app.post("/urls/:shortURL", (req, res) => {
  const userId = req.session.user_id;
  if (userId) {
    const shortURL = req.params.shortURL;
    if (urlDatabase[shortURL]) {
      urlDatabase[shortURL].longURL = req.body.editted;
      res.redirect("/urls");
    } else {
      res.redirect("access_denied");
    }
  } else {
    res.redirect("access_denied");
  }
});

// If email and password params match an existing user,  set the cookie and redirects to main page (/urls)
app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const userID = helpers.getUserByEmail(email, users);
  if (userID) {
    // if user's password matches
    if (bcrypt.compareSync(password, users[userID].password)) {
      req.session.user_id = userID;
      res.redirect("/urls");
    } else {
      res.render("message", { val: " Email and password don't match an existing user. Please try again.", user: undefined });
    }
  }
});

// If user is not logged in, renders the login page containing login form
app.get("/login", (req, res) => {
  const userId = req.session.user_id;
  if (userId) {
    res.redirect("/urls");
  } else {
    res.render("login", {user: undefined});
  }
});

// Deletes the cookie and redirect to "/urls"
app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/urls");
});

// If user is not logged in, renders the register page containing register form
app.get("/register", (req, res) => {
  const userId = req.session.user_id;
  if (userId) {
    res.redirect("/urls");
  } else {
    res.render("register" , {user: undefined});
  }
});

// If the email/pass is empty or the email already exists then render error page, otherwise, creates a new user and set its cookie.
app.post("/register", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  if (!email || !password) {
    res.render("message", { val: "Email and password are required fields. Please provide both of them", user: undefined });
  }
  if (helpers.getUserByEmail(email, users)) {
    res.render("message", { val: "Email already exists! Please choose another email for registeration.", user: undefined });
  } else {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const id = generateRandomString();
    users[id] = {
      id,
      email,
      password: hashedPassword,
    };
    // res.cookie("user_id", id);
    req.session.user_id = id;
    res.redirect("/urls");
  }

});

// a function that generates 6 char long random strings
const generateRandomString = () => {
  return Math.random().toString(36).substr(2, 6);
};