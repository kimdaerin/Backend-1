const express = require('express');
const router = express.Router();
const { User, Comment, Recomment } = require('../models');
const authMiddleware = require('../middlewares/authMiddlware');
const ErrorCustom = require('../advice/errorCustom');
const admin = require('firebase-admin');

// 대댓글 작성
router.post('/:commentKey', authMiddleware, async (req, res, next) => {
  try {
    const { userKey, nickname } = res.locals.user;
    const { commentKey } = req.params;
    const { comment } = req.body;

    if (comment === '') {
      throw new ErrorCustom(400, '대댓글을 입력해주세요.');
    }

    const data = await Comment.findOne({
      where: { commentKey },
      include: [{ model: User, attributes: ['deviceToken'] }],
    });

    if (!data) {
      throw new ErrorCustom(400, '해당 댓글이 존재하지 않습니다.'); //댓글 확인
    }

    const newComment = await Recomment.create({
      comment,
      commentKey,
      userKey,
    });

    newComment.updatedAt = newComment.updatedAt.setHours(
      newComment.updatedAt.getHours() + 9
    );

    if (data.User.deviceToken) {
      let target_token = data.User.deviceToken;

      const message = {
        notification: {
          title: '곰곰',
          body: '작성한 댓글에 대댓글이 달렸습니다.',
        },
        token: target_token,
        data: {
          title: '곰곰 알림',
          body: '게시물에 댓글이 달렸습니다!',
        },
        webpush: {
          fcm_options: {
            link: '/',
          },
        },
      };

      admin
        .messaging()
        .send(message)
        .then(function (response) {
          console.log('Successfully sent push: : ', response);
        })
        .catch(function (err) {
          console.log('Error Sending push!!! : ', err);
        });
    }

    return res.status(200).json({
      ok: true,
      msg: '대댓글 작성 성공',
      result: {
        commentKey: data.commentKey,
        recommentKey: newComment.recommentKey,
        comment: newComment.comment,
        User: { nickname },
        userKey,
        updatedAt: newComment.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

// 해당 대댓글 수정
router.put('/:recommentKey', authMiddleware, async (req, res, next) => {
  try {
    const { userKey, nickname } = res.locals.user;
    const { recommentKey } = req.params;
    const { comment } = req.body;

    if (comment === '') {
      throw new ErrorCustom(400, '대댓글을 입력해주세요.');
    }

    const data = await Recomment.findOne({
      where: { recommentKey },
    });

    const commentdata = await Recomment.findOne({
      where: { commentKey: data.commentKey },
    });

    if (!data) {
      throw new ErrorCustom(400, '해당 대댓글이 존재하지 않습니다.');
    }

    if (userKey !== data.userKey) {
      throw new ErrorCustom(400, '작성자가 다릅니다.');
    } else {
      await Recomment.update(
        { comment: comment },
        { where: { recommentKey, userKey } }
      );

      const updateComment = await Recomment.findOne({
        where: { recommentKey },
      });

      return res.status(200).json({
        ok: true,
        msg: '대댓글 수정 성공',
        result: {
          commentKey: commentdata.commentKey,
          recommentKey: updateComment.recommentKey,
          comment,
          User: { nickname },
          nickname: nickname,
          userKey,
          updatedAt: updateComment.updatedAt,
        },
      });
    }
  } catch (err) {
    next(err);
  }
});

// 대댓글 삭제
router.delete('/:recommentKey', authMiddleware, async (req, res, next) => {
  try {
    const { userKey, nickname } = res.locals.user;
    const { recommentKey } = req.params;

    const data = await Recomment.findOne({ where: { recommentKey } });

    if (!data) {
      throw new ErrorCustom(400, '해당 대댓글이 존재하지 않습니다.');
    }

    if (userKey !== data.userKey) {
      throw new ErrorCustom(400, '작성자가 다릅니다.');
    } else {
      await Recomment.destroy({ where: { recommentKey, userKey } });

      return res.status(200).json({
        ok: true,
        msg: '대댓글 삭제 성공',
        result: {
          commentKey: data.commentKey,
          recommentKey: data.recommentKey,
          comment: data.comment,
          nickname: nickname,
          userKey,
        },
      });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
