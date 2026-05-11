import { Request, Response } from "express";
import * as authService from "../services/auth.service";

export async function login(req: Request, res: Response) {
  try {
    const result = await authService.login(req.body.email, req.body.password);
    return res.json(result);
  } catch (error) {
    return res.status(401).json({
      message: "Invalid email or password"
    });
  }
}

export async function me(req: Request, res: Response) {
  return res.json({ user: req.user });
}

export async function changePassword(req: Request, res: Response) {
  try {
    const result = await authService.changePassword(
      req.user!.id,
      req.body.current_password,
      req.body.new_password
    );

    res.json(result);
  } catch (error) {
    res.status(400).json({
      message:
        error instanceof Error ? error.message : "Failed to change password"
    });
  }
}