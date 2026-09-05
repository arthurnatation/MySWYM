/** Boot soft mist : le mark se pose. Styles dans index.html. */
export default function Loading() {
  return (
    <div className="myswym-boot" role="status" aria-live="polite" aria-busy="true">
      <div className="myswym-boot-inner">
        <div className="myswym-boot-stage" aria-hidden="true">
          <span className="myswym-boot-blob" />
          <img
            className="myswym-boot-mark"
            src="/logo-mark.png"
            alt=""
            width={168}
            height={111}
          />
        </div>
        <img
          className="myswym-boot-wordmark"
          src="/logo-myswym-on-light.png"
          alt="mySWYM"
          height={22}
          width={151}
        />
      </div>
    </div>
  );
}
