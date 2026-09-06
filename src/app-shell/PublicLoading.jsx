/** Chargement marketing : wordmark + barre. Styles dans index.html. */
export default function PublicLoading() {
  return (
    <div className="myswym-boot myswym-boot--public" role="status" aria-live="polite" aria-busy="true">
      <div className="myswym-boot-inner">
        <img
          className="myswym-boot-wordmark myswym-boot-wordmark--public myswym-boot-wordmark--static"
          src="/logo-myswym-on-light.png"
          alt="MySWYM"
          height={22}
          width={95}
        />
        <div className="myswym-boot-track" aria-hidden="true">
          <span className="myswym-boot-bar" />
        </div>
      </div>
    </div>
  );
}
