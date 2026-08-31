(() => {
  const setNativeValue = (element, value) => {
    const prototype = element instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLSelectElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    setter?.call(element, value);
  };

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest(".category-tabs button");
    if (!button) return;

    const search = document.querySelector(".catalog-search input[type='search']");
    if (search instanceof HTMLInputElement && search.value) {
      setNativeValue(search, "");
      search.dispatchEvent(new Event("input", { bubbles: true }));
      search.dispatchEvent(new Event("change", { bubbles: true }));
    }

    const status = document.querySelector(".catalog-search select");
    if (status instanceof HTMLSelectElement && status.value !== "all") {
      setNativeValue(status, "all");
      status.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }, true);
})();
