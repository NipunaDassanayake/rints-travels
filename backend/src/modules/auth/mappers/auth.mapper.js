const toRegisterUserDto = (body) => ({
  firstName: body.firstName,
  lastName: body.lastName,
  email: body.email.trim().toLowerCase(),
  phone: body.phone || null,
  password: body.password,
});

const toLoginDto = (body) => ({
  email: body.email.trim().toLowerCase(),
  password: body.password,
});

const toAuthUserResponse = (user) => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  provider: user.provider,
  isEmailVerified: user.isEmailVerified,
  status: user.status,
  profileImageUrl: user.profileImageUrl,
  createdAt: user.createdAt,
});

module.exports = {
  toRegisterUserDto,
  toLoginDto,
  toAuthUserResponse,
};