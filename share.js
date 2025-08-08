function initShareButtons() {
  const pageUrl = location.href;

  // 記事タイトルを h2 から取得（title要素じゃない！）
  const heading = document.querySelector(".news h2");
  const articleTitle = heading ? heading.textContent.trim() : "sushihamsterのニュース";

  const shareTitle = `${articleTitle} | sushihamsterのホームページ`;

  // Twitterでシェア
  const twitterBtn = document.querySelector(".sns-btn.tw");
  if (twitterBtn) {
    twitterBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(pageUrl)}`;
      window.open(twitterUrl, "_blank", "noopener,noreferrer,width=550,height=420");
    });
  }

  // Instagram
  const instaBtn = document.querySelector(".sns-btn.ig");
  if (instaBtn) {
    instaBtn.addEventListener("click", (e) => {
      e.preventDefault();
      alert("InstagramストーリーズはWebから直接共有できません。\nスマホで画面をスクショしてInstagramにアップしてください📸");
    });
  }

  // YouTube
  const ytBtn = document.querySelector(".sns-btn.yt");
  if (ytBtn) {
    ytBtn.addEventListener("click", (e) => {
      e.preventDefault();
      alert("YouTubeの動画リンクをここに設定してください！");
    });
  }
}
