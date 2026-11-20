import type { Topic } from './types'

export interface SourceErratum {
  id: string
  title: string
  /** Page numbers count from 1 in the actual PDF, rather than its printed footer. */
  sources: Array<{ filename: string; page: number }>
  correction: string
  evidence: string
}

/** Confirmed by reviewing the original page and checking the mathematical claim. */
export const errata: SourceErratum[] = [
  {
    id: 'junior-weighted-distance',
    title: '胡不归模型的速度比',
    sources: [{ filename: '20.胡不归.pdf', page: 1 }],
    correction: '已知 v₁ > v₂，从 AC/v₁ + BC/v₂ 中提取 1/v₂ 后，AC 的系数应为 v₂/v₁。构造正弦时应使用小于 1 的 v₂/v₁。',
    evidence: '原页面把比值写反；将正确系数乘回即可核对时间表达式。',
  },
  {
    id: 'junior-fixed-chord-angle',
    title: '定弦定角第三类的角度符号',
    sources: [{ filename: '25.隐圆模型---定弦定角.pdf', page: 1 }],
    correction: '第三类图示对应钝角，应写 ∠C > 90°。使用圆弧轨迹时还需检查点所在半平面与活动范围。',
    evidence: '已回看原图：点位于劣弧，对应圆周角为钝角，原文误重复了小于号。',
  },
  {
    id: 'senior-strong-induction',
    title: '第二数学归纳法的归纳假设',
    sources: [{ filename: '专题15数列不等式的证明微点2数学归纳法证明数列不等式.pdf', page: 1 }],
    correction: '强归纳法的归纳步骤可以假设起始指标至 k 的全部命题成立，再证明 k+1；只假设第 k 项是第一数学归纳法的写法。',
    evidence: '原页第二数学归纳法段落重复了第一归纳法的步骤；两种方法的归纳假设应区分。',
  },
  {
    id: 'competition-period-iteration',
    title: '周期表中两种迭代的周期',
    sources: [{ filename: '函数周期性、对称性.pdf', page: 4 }],
    correction: 'h(u)=(1−u)/(1+u) 两次迭代回到 u，对应推出 2a 为周期；h(u)=−1/(u+1) 三次迭代回到 u，对应推出 3a 为周期。先检查分母有定义，不能据此直接断言最小正周期。',
    evidence: '原表第 6、7 条的 2a 与 3a 互换；直接计算 h(h(u)) 与三次迭代可以核对。',
  },
  {
    id: 'competition-chebyshev-t6',
    title: '第六阶切比雪夫多项式的系数',
    sources: [{ filename: '切比雪夫多项式与切比雪夫逼近.pdf', page: 2 }],
    correction: 'T₆(x)=32x⁶−48x⁴+18x²−1，二次项系数应为 +18。',
    evidence: '用 Tₙ₊₁=2xTₙ−Tₙ₋₁ 递推可得；代入 x=1 还必须满足 T₆(1)=1。',
  },
  {
    id: 'competition-mean-value-results',
    title: '罗尔与柯西中值定理的结论',
    sources: [{ filename: '中值定理.pdf', page: 2 }],
    correction: '端点等值时，罗尔定理给出某个内部点 f′(ξ)=0；柯西中值定理联系两个函数的增量与导数，比值写法还须满足分母非零等条件。原页的两项结论被错置。',
    evidence: '已回看定理页并对照两种定理的假设与结论，不能按该页公式直接背诵。',
  },
  {
    id: 'competition-convexity-sign',
    title: '多元函数凹凸定义的符号',
    sources: [{ filename: '多元函数导数（二）.pdf', page: 1 }],
    correction: '凸函数满足 f(tx+(1−t)y) ≤ t f(x)+(1−t)f(y)，凹函数使用相反方向。原页两种定义印成了相同的不等号。',
    evidence: '可用 f(x)=x² 和 f(x)=−x² 在区间中点检验两种方向。',
  },
  {
    id: 'competition-fibonacci-index',
    title: '斐波那契数的初值与通项编号',
    sources: [{ filename: '斐波那契数.pdf', page: 1 }],
    correction: '标准 Binet 公式 (φⁿ−ψⁿ)/√5 对应 F₀=0、F₁=1。若初值选 F₀=F₁=1，通项的指数需要相应平移为 n+1。',
    evidence: '原页同时采用了两种不同编号约定；代入 n=0 可直接发现矛盾。',
  },
  {
    id: 'competition-schur-sufficiency',
    title: 'Schur 分拆系数非负是充分条件',
    sources: [{ filename: 'Schur不等式与Schur分拆.pdf', page: 2 }],
    correction: '把对称多项式分拆成若干非负基式后，系数全非负可以保证原式非负；出现负系数不代表原式一定为负，不能把该条件当成充要判据。',
    evidence: '平方 (x²+y²+z²−xy−yz−zx)² 恒非负，但其原稿所用基式分拆中存在负系数。',
  },
  {
    id: 'competition-geometric-trials',
    title: '几何分布的试验次数并不固定',
    sources: [
      { filename: '其它分布.pdf', page: 3 },
      { filename: '概率中的新定义问题（一）.pdf', page: 1 },
    ],
    correction: '几何分布描述独立、同成功率试验中首次成功的试验序号 T=1,2,…。固定 n 次试验中的成功总数对应二项分布；最多试验 N 次时还需处理截断的末项。',
    evidence: '原页把“试验次数固定”列入几何分布条件，与同页首次成功的定义冲突。',
  },
  {
    id: 'competition-variance-bound',
    title: '切比雪夫界不能直接比较实际概率',
    sources: [{ filename: '切比雪夫不等式、极大似然估计.pdf', page: 3 }],
    correction: '方差较小会改善切比雪夫给出的通用概率界；对两个不同分布，不能只凭方差大小断言落在均值附近的实际概率大小。',
    evidence: '同均值变量 X 以 0.1、0.8、0.1 取 −4、0、4，Y 以 0.005、0.99、0.005 取 −20、0、20：Var(X)=3.2<4=Var(Y)，但半径 3 的中心概率为 0.8<0.99。',
  },
  {
    id: 'competition-quotient-order',
    title: '集合新定义题的商方向与量词',
    sources: [{ filename: '集合中的新定义问题二.pdf', page: 5 }],
    correction: '原题限定 1≤i≤j≤n，商为 aⱼ/aᵢ。后续讲解中不能交换为 aᵢ/aⱼ，也不能用另一组有序对满足条件来替代当前有序对的验证。',
    evidence: '已逐项核对题目定义与讲解使用的指标范围；有序对方向和“任意”的量词都须保留。',
  },
]

export function getTopicErrata(topic: Topic): SourceErratum[] {
  const filenames = new Set(topic.documents.map((document) => document.filename))
  return errata.filter((entry) => entry.sources.some((source) => filenames.has(source.filename)))
}
