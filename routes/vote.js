const express = require('express');
const router = express.Router();
const { Select, User, Vote } = require('../models');
const authMiddleware = require('../middlewares/authMiddlware');
const isLoginMiddlware = require('../middlewares/isLoginMiddlware');
const ErrorCustom = require('../advice/errorCustom');

// 선택지 투표
router.post('/:selectKey', authMiddleware, async (req, res, next) => {
  try {
    const { userKey } = res.locals.user;
    const { selectKey } = req.params;
    const { choice } = req.body;

    const data = await Select.findOne({ where: { selectKey } });

    if (!data) {
      throw new ErrorCustom(400, '해당 선택글이 존재하지 않습니다.');
    }

    if (userKey === data.userKey) {
      throw new ErrorCustom(400, '본인 글에는 투표할 수 없습니다.');
    }

    // 투표했는지 확인
    const voteCheck = await Vote.findOne({
      where: { selectKey, userKey },
    });

    // 안하면 투표 데이터 생성
    if (!voteCheck) {
      await Vote.create({
        selectKey,
        userKey,
        choice,
      });

      const datas = await Vote.findAll({
        where: { selectKey },
      });

      let count1 = 0;
      let count2 = 0;
      let count3 = 0;
      let count4 = 0;
      datas.map((e) => {
        if (e.choice === 1) {
          ++count1;
        } else if (e.choice === 2) {
          ++count2;
        } else if (e.choice === 3) {
          ++count3;
        } else if (e.choice === 4) {
          ++count4;
        }
      });
      let total = count1 + count2 + count3 + count4;

      //선택글 투표시 +1점씩 포인트 지급
      let votePoint = await User.findOne({ where:{userKey}})
      await votePoint.update({ point: votePoint.point + 1})

      return res.status(200).json({
        ok: true,
        msg: '선택지 투표 성공',
        result: {
          1: (Math.round((count1 / total) * 100) / 100) * 100,
          2: (Math.round((count2 / total) * 100) / 100) * 100,
          3: (Math.round((count3 / total) * 100) / 100) * 100,
          4: (Math.round((count4 / total) * 100) / 100) * 100,
          total,
          isVote: choice,
          votePoint:votePoint.point
        },
      });
    } else {
      throw new ErrorCustom(400, '이미 투표를 실시했습니다.');
    }
  } catch (err) {
    next(err);
  }
});

// 선택지 비율 조회
router.get('/:selectKey', isLoginMiddlware, async (req, res, next) => {
  try {
    const { selectKey } = req.params;

    const isSelect = await Select.findOne({ where: { selectKey } });

    if (!isSelect) {
      throw new ErrorCustom(400, '해당 선택글이 존재하지 않습니다.');
    }

    const datas = await Vote.findAll({
      where: { selectKey },
    });

    let count1 = 0;
    let count2 = 0;
    let count3 = 0;
    let count4 = 0;
    datas.map((e) => {
      if (e.choice === 1) {
        ++count1;
      } else if (e.choice === 2) {
        ++count2;
      } else if (e.choice === 3) {
        ++count3;
      } else if (e.choice === 4) {
        ++count4;
      }
    });
    let total = count1 + count2 + count3 + count4;

    // 글이 마감되었는지 확인 마감되면 바로 투표결과 보여줌
    let now = new Date();
    now = now.setHours(now.getHours() + 9);
    if (now > new Date(isSelect.deadLine)) {
      return res.status(200).json({
        ok: true,
        msg: '마감된 투표 조회 성공',
        result: {
          1: (Math.round((count1 / total) * 100) / 100) * 100,
          2: (Math.round((count2 / total) * 100) / 100) * 100,
          3: (Math.round((count3 / total) * 100) / 100) * 100,
          4: (Math.round((count4 / total) * 100) / 100) * 100,
          total,
        },
      });
    }

    const user = res.locals.user;
    // 미들웨어를 거쳐서 로그인 유무 확인(비로그인시)
    if (!user) {
      return res.status(200).json({
        ok: true,
        msg: '비로그인 상태',
        result: { total },
      });
    } else {
      // 미들웨어를 거쳐서 로그인 유무 확인(로그인시)
      const userKey = user.userKey;

      // 글작성자인지 확인
      if (userKey === isSelect.userKey) {
        return res.status(200).json({
          ok: true,
          msg: '글작성자가 투표 조회 성공',
          result: {
            1: (Math.round((count1 / total) * 100) / 100) * 100,
            2: (Math.round((count2 / total) * 100) / 100) * 100,
            3: (Math.round((count3 / total) * 100) / 100) * 100,
            4: (Math.round((count4 / total) * 100) / 100) * 100,
            total,
          },
        });
      }

      const voteCheck = await Vote.findOne({
        where: { selectKey, userKey },
      });

      // 로그인은 했지만, 투표를 안하면 비율 안보이게함
      if (!voteCheck) {
        return res.status(200).json({
          ok: true,
          msg: '참여자가 투표를 하지 않음',
          result: { total },
        });
      } else {
        // 로그인하고 투표까지하면 투표비율 보여줌
        const isVote = await Vote.findOne({
          where: { selectKey, userKey },
          attributes: ['choice'],
        });

        return res.status(200).json({
          ok: true,
          msg: '선택지 비율 조회 성공',
          result: {
            1: (Math.round((count1 / total) * 100) / 100) * 100,
            2: (Math.round((count2 / total) * 100) / 100) * 100,
            3: (Math.round((count3 / total) * 100) / 100) * 100,
            4: (Math.round((count4 / total) * 100) / 100) * 100,
            total,
            isVote: isVote.choice,
          },
        });
      }
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
