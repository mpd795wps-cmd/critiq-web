import { Router, type IRouter } from "express";
import healthRouter from "./health";
import amazonRouter from "./amazon";

const router: IRouter = Router();

router.use(healthRouter);
router.use(amazonRouter);

export default router;
