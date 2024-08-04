const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const data = JSON.parse(fs.readFileSync("data.json", "utf-8"));

// Phương thức đăng nhập
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  // Tìm người dùng trong mảng
  const user = data.users.find((user) => user.email === email);
  if (!user) {
    return res
      .status(401)
      .json({ message: "Email đăng nhập hoặc mật khẩu không đúng" });
  }

  // Kiểm tra mật khẩu
  if (password !== user.password) {
    return res
      .status(401)
      .json({ message: "mật khẩu không đúng" });
  }

  // Tạo mã thông báo (token)
  const token = jwt.sign(user, "secret_key");

  return res.status(200).json({ message: "Đăng nhập thành công", token });
});

// Middleware xác thực token
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, "secret_key", (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Lấy thông tin người dùng
app.get("/users", (req, res) => {
  const users = data.users;
  res.json(users);
});

// Thêm người dùng
app.post("/users", (req, res) => {
  const newUser = req.body;

  const existingEmail = data.users.find(
    (user) => user.email === newUser.email
  );

  if (existingEmail) {
    return res.status(409).json({
      message: {
        type: 1,
        text: "Email đã tồn tại",
      },
    });
  }

  // Lưu người dùng mới vào mảng
  data.users.push(newUser);

  fs.writeFileSync("data.json", JSON.stringify(data, null, 4));
  return res.status(201).json({
    message: {
      type: 2,
      text: "Người dùng đã được tạo",
    },
    user: newUser,
  });
});

//Sửa người dùng

// app.put("/users/:id", (req, res) => {
//   const userId = req.params.id;
//   const updatedUser = req.body;
//   const users = data.users;

//   // Tìm người dùng cần sửa
//   const userIndex = users.findIndex((user) => user.id === userId);
//   if (userIndex === -1) {
//     return res.status(404).json({
//       message: {
//         type: 1,
//         text: "Không tìm thấy người dùng",
//       },
//     });
//   }
//   // Kiểm tra xem username và email có tồn tại không

//   const newArrUser = users.filter((user) => {
//     return user.id !== userId;
//   });

//   const existingUsername = newArrUser.find(
//     (user) => user.username === updatedUser.username && user.id !== userId
//   );
//   if (existingUsername) {
//     return res.status(400).json({
//       message: {
//         type: 1,
//         text: "Username đã tồn tại",
//       },
//     });
//   }

//   const existingEmail = newArrUser.find(
//     (user) => user.email === updatedUser.email && user.id !== userId
//   );
//   if (existingEmail) {
//     return res.status(400).json({
//       message: {
//         type: 1,
//         text: "Email đã tồn tại",
//       },
//     });
//   }

//   // Cập nhật thông tin người dùng
//   users[userIndex] = {
//     ...users[userIndex],
//     username: updatedUser.username || users[userIndex].username,
//     name: updatedUser.name || users[userIndex].name,
//     email: updatedUser.email || users[userIndex].email,
//     password: updatedUser.password || users[userIndex].password,
//     role: updatedUser.role || users[userIndex].role,
//     division: updatedUser.division || users[userIndex].division,
//     position: updatedUser.position || users[userIndex].position,
//     phone: updatedUser.phone || users[userIndex].phone,
//     address: updatedUser.address || users[userIndex].address,
//     love: updatedUser.love || users[userIndex].love,
//     gender: updatedUser.gender || users[userIndex].gender,
//   };

//   const newUser = users[userIndex];
//   fs.writeFileSync("data.json", JSON.stringify(data, null, 4));
//   return res.status(200).json({
//     message: {
//       type: 2,
//       text: "Cập nhật thông tin thành công",
//     },
//     newUser,
//   });
// });


//Xoá người dùng
app.delete("/users/:id", (req, res) => {
  const userId = req.params.id;

  // Tìm index của người dùng trong mảng
  const userIndex = data.users.findIndex((user) => user.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({ message: "Người dùng không tồn tại" });
  }

  // Xoá người dùng khỏi mảng
  const deletedUser = data.users.splice(userIndex, 1)[0];
  fs.writeFileSync("data.json", JSON.stringify(data, null, 4));
  return res
    .status(200)
    .json({ message: "Người dùng đã được xoá", user: deletedUser });
});


// Ví dụ về một tài nguyên cần xác thực token
app.get("/protected", authenticateToken, (req, res) => {
  // Kiểm tra quyền truy cập dựa trên vai trò của người dùng
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Bạn không có quyền truy cập" });
  }

  return res
    .status(200)
    .json({ message: "Truy cập thành công vào tài nguyên được bảo vệ" });
});

// Reset password via email
app.post("/reset-password", (req, res) => {
  const { email } = req.body;
  const user = data.users.find((user) => user.email === email);

  if (!user) {
    return res
      .status(404)
      .json({ type: 1, message: "Không tìm thấy người dùng" });
  }

  // Generate a new password
  const newPassword = Math.random().toString(36).slice(2, 10);

  // Update the user's password in the data structure
  user.password = newPassword;

  fs.writeFileSync("data.json", JSON.stringify(data, null, 4));

  // Set up email transporter using the built-in nodemailer
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "hoangcongminh406@gmail.com",
      pass: "upks ydcl txhr ezno",
    },
  });

  // Define email options
  const mailOptions = {
    from: "hoangcongminh406@gmail.com",
    to: user.email,
    subject: "Authentic Shoes - Mật khẩu mới",
    text: `
    Bạn đang thực hiện Reset mật khẩu tại Authentic Shoes
    Mật khẩu mới của bạn là: ${newPassword}
    Vui lòng không chia sẻ mật khẩu cho bất kỳ ai!!!
    `,
  };

  // Send the email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return res.status(500).json({ error: "Đặt lại mật khẩu thất bại" });
    } else {
      return res.status(200).json({
        type: 2,
        message: "Mật khẩu mới đã được gửi tới email của bạn!!!",
      });
    }
  });
});

// Lấy danh sách sản phẩm và sort ngẫu nhiên
app.get('/products', (req, res) => {
  // Xáo trộn thứ tự các sản phẩm
  const shuffledProducts = [...data.products].sort(() => Math.random() - 0.5);
  res.json(shuffledProducts);
});

// Lấy ra danh sách sản phẩm theo brand
app.get('/products/brand/:brandName', (req, res) => {
  const brandName = req.params.brandName;
  const filteredProducts = data.products.filter(product => product.brand.toLowerCase() === brandName.toLowerCase());
  res.json(filteredProducts);
});


// Lấy ra danh sách sản phẩm theo category
app.get('/products/category/:categoryName', (req, res) => {
  const categoryName = req.params.categoryName;
  const filteredProducts = data.products.filter(product => product.category.toLowerCase() === categoryName.toLowerCase());
  res.json(filteredProducts);
});




// Khởi chạy server
app.listen(3000, () => {
  console.log("Server đang chạy trên cổng 3000");
});
