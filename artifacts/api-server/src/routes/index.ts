import { Router, type IRouter } from "express";
import healthRouter from "./health";
import janRouter from "./jan";

const router: IRouter = Router();

router.use(healthRouter);
router.use(janRouter);

export default router;
