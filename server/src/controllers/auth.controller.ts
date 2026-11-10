import { Request, Response, NextFunction } from 'express';
import * as AuthService from '../services/auth.service';

export async function signupHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await AuthService.signup(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await AuthService.login(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function refreshHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body as { refreshToken: string };
    const result = await AuthService.refresh(refreshToken);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function forgotPasswordHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await AuthService.requestPasswordReset(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function resetPasswordHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await AuthService.resetPassword(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getMeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await AuthService.getMe(req.user!.id);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

export async function updateMeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await AuthService.updateMe(req.user!.id, req.body);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}
