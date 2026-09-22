const UserModel = require('../models/userSchema')
const TokenRevokeModel = require('../models/tokenRevokeSchema')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const AppError = require('../errors/AppError')

exports.createUser = async (req, res) => {
  const {
    username,
    password

  } = req.body
  const checkIfThereIsAlreadyThereIsaUser = await UserModel.find()
  if (checkIfThereIsAlreadyThereIsaUser.length > 0) {
    throw new AppError('user already exist', 409)
  }

  const salt = await bcrypt.genSalt()
  const hash = await bcrypt.hash(password, salt)

  const newUser = new UserModel({
    username,
    password: hash

  })
  await newUser.save()
  res.status(201).json({ error: null, msg: 'User created correctly' })
}

exports.loginUser = async (req, res) => {
  const { username, password } = req.body

  const findUser = await UserModel.findOne({ username })
  const passwordOk = findUser && await bcrypt.compare(password, findUser.password)

  const validUserPassword = !((!findUser || !passwordOk))

  if (!validUserPassword) {
    throw new AppError('invalid credentials', 401)
  }
  const token = jwt.sign({ id: findUser._id, role: findUser.role }, process.env.JWT_SECRET,
    { expiresIn: '12h' })

  findUser.token = token

  const loadToken = await UserModel.findOneAndUpdate({ username: findUser.username }, findUser)
  if (!loadToken) {
    throw new AppError('user not found', 404)
  }

  res.status(200).json({ error: null, msg: 'user logged', token })
}

exports.logoutUser = async (req, res) => {
  const userId = res.locals.id
  const token = res.locals.token
  const findUserAndUpdate = await UserModel.findByIdAndUpdate({ _id: userId }, { $set: { token: '' } }, { new: true })
  if (!findUserAndUpdate) {
    throw new AppError('user not found', 404)
  }
  const currentDate = new Date()
  const newRevokeToken = new TokenRevokeModel({ tokenRevoke: token, expiration: currentDate })
  await newRevokeToken.save()
  res.status(200).json({ error: null, msg: 'user logout' })
}
