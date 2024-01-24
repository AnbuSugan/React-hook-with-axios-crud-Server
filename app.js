const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { Sequelize, DataTypes } = require("sequelize");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
const port = 3001;
const secretKey = "yourSecretKey";

app.use(cors());
app.use(bodyParser.json());

const sequelize = new Sequelize("RegisterMapping", "postgres", "anbu@2023", {
  host: "localhost",
  dialect: "postgres",
});

function createSequenceGenerator(start = 1000, increment = 20) {
  let currentValue = start - increment;

  function getNextValue() {
    currentValue += increment;
    return currentValue;
  }

  return getNextValue;
}

const User = sequelize.define("User", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false,
    defaultValue: createSequenceGenerator(1000, 20),
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  date: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
});

const UserProfile = sequelize.define("UserProfile", {
  mobileNumber: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  state: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  zip: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  userName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

User.hasOne(UserProfile);
UserProfile.belongsTo(User);

app.post("/api/register", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      date,
      email,
      mobileNumber,
      city,
      state,
      zip,
      userName,
      password,
    } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      firstName,
      lastName,
      date,
      email,
    });

    const userProfile = await UserProfile.create({
      mobileNumber,
      city,
      state,
      zip,
      userName,
      password: hashedPassword,
    });

    await user.setUserProfile(userProfile);

    res.status(200).json({ message: "Registration completed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { userName, password } = req.body;

    const user = await User.findOne({
      include: [{ model: UserProfile, where: { userName } }],
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.UserProfile.password
    );

    if (passwordMatch) {
      const token = jwt.sign({ userId: user.id }, secretKey, {
        expiresIn: "1h",
      });

      res.status(200).json({ message: "Login successful", token });
    } else {
      res.status(401).json({ error: "Invalid username or password" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(403).json({ error: "Token not provided" });
  }

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Failed to authenticate token" });
    }

    req.userId = decoded.userId;
    next();
  });
};

const Course = sequelize.define("course", {
  coursename: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  coursedescription: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  courseprice: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  courseduration: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});
UserProfile.hasOne(Course);
Course.belongsTo(UserProfile);

app.post("/api/create", async (req, res) => {
  try {
    if (
      !req.body.coursename ||
      !req.body.coursedescription ||
      !req.body.courseprice ||
      !req.body.courseduration
    ) {
      res.status(400).send({
        message: "All Details Required!",
      });
      return;
    }

    const course = {
      coursename: req.body.coursename,
      coursedescription: req.body.coursedescription,
      courseprice: req.body.courseprice,
      courseduration: req.body.courseduration,
    };

    const createdCourse = await Course.create(course);

    res.status(201).send(createdCourse);
  } catch (error) {
    console.error(error);

    res.status(500).send({
      message: "Internal Server Error",
    });
  }
});

app.get("/api/findall", async (req, res) => {
  try {
    const data = await Course.findAll();
    res.send(data);
  } catch (err) {
    res.status(500).send({
      message: err.message || "Some error occurred while retrieving tutorials.",
    });
  }
});
app.delete("/api/delete/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const num = await Course.destroy({
      where: { id: id },
    });

    if (num == 1) {
      res.send({
        message: "Course was deleted successfully!",
      });
    } else {
      res.status(400).send({
        message: `Cannot delete Tutorial with id=${id}. Maybe Tutorial was not found!`,
      });
    }
  } catch (err) {
    res.status(500).send({
      message: "Could not delete Tutorial with id=" + id,
    });
  }
});

app.get("/currentid/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const course = await Course.findByPk(id);
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }

    res.status(200).json(course);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.put("/api/update/:id", async (req, res) => {
  const id = req.params.id;

  Course.update(req.body, {
    where: { id: id },
  })
    .then((num) => {
      if (num == 1) {
        res.send({
          message: "Course was updated successfully.",
        });
      } else {
        res.status(400).send({
          message: `Cannot update Course with id=${id}. Maybe Course was not found or req.body is empty!`,
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        message: "Error updating Course with id=" + id,
      });
    });
});

app.post("/api/logout", verifyToken, (req, res) => {
  res.status(200).json({ message: "Logout successful" });
});

sequelize.sync().then(() => {
  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
});
