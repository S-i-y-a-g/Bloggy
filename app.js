const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const bcrypt = require("bcrypt");
const app = express();

app.use(express.static(path.join(__dirname)));


app.use(express.static("public"));
app.use(bodyParser.json());


mongoose.connect("mongodb://127.0.0.1:27017/mongopractice", {    
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    username: { type: String, unique: true },
    password: { type: String, required: true },
    blogs: [{ title: String, content: String }],
});

const userModel = mongoose.model("User", userSchema);

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/signup", async (req, res) => {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
        return res.status(400).json({ message: "All fields are required." });
    }

    try {
        const existingUser = await userModel.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ message: "User with this email or username already exists." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new userModel({ email, username, password: hashedPassword });
        await newUser.save();

        return res.json({ success: true, message: "Signup successful!" });   
    } catch (error) {
        console.error("Error during signup:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
});

app.post("/create-blog", async (req, res) => {
    const { username, title, content } = req.body;

    if (!title || !content || !username) {
        return res.status(400).json({ message: "All fields are required." });
    }

    try {
        const user = await userModel.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        const newBlog = { title, content, time: new Date() }; 
        user.blogs.push(newBlog);

        await user.save(); 
        return res.json({ success: true, message: "Blog created successfully!" });
    } catch (error) {
        console.error("Error creating blog:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
});

app.get("/recent-blogs", async (req, res) => {
    try {
        const users = await userModel.find();
        let allBlogs = [];
        users.forEach(user => {
            user.blogs.forEach(blog => {
                allBlogs.push({
                    username: user.username,
                    title: blog.title,
                    content: blog.content,
                    time: blog.time
                });
            });
        });

        allBlogs.sort((a, b) => new Date(b.time) - new Date(a.time));
        return res.json(allBlogs);
    } catch (error) {
        console.error("Error fetching recent blogs:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
});

app.get("/users", async (req, res) => {     
    try {
        const users = await userModel.find();

        const usersWithBlogs = users.map(user => ({
            username: user.username,
            email: user.email,
            blogs: user.blogs
        }));

        return res.json(usersWithBlogs);
    } catch (error) {
        console.error("Error fetching users with blogs:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'homepage.html'));
});

app.get('/click', (req, res) => {
    res.sendFile(path.join(__dirname, 'create_blog.html'));
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000/");
});