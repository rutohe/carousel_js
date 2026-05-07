//きれいに書きなおしといて 08/10:もうちょい関数化してまとめる
//currentindexとtransform3dやインジケーター更新の処理が分散している→一つの関数にして使いまわそう

export function createCarousel({
    root = document.querySelector('.carousel'),
    loop = true,
    loopSecond = 4000 ,
    showIndicators = true,
    showModal = true,
    showAltText = true,
    transitionSecond = 0.5,
}){
    const wrapper = root.querySelector('.carousel-wrapper');
    let wrapperItems = root.querySelectorAll('.carousel-link');
    let itemsLen = wrapperItems.length;
    let carouselImgs = root.querySelectorAll('.carousel-img');
    const copyZero = wrapperItems[0];
    const copyLast = wrapperItems[itemsLen - 1];
    let indicator;
    let intervalId = null;
    let currentindex = 1;
    let pendingJumpTo = null;
    let slideDirection;
    
    //配列のindexに加減算したものを返す関数
    const searchindex = (array,nowindex,num) => {
        nowindex = (nowindex + num + array.length) % array.length;
        return nowindex;
    }

    //インジケーター更新関数
    const updateIndicators = (index) => {
        if(!showIndicators || !indicator) return;
        indicator.forEach(ind=>{
            ind.classList.remove('now');
        })
        indicator[index - 1].classList.add('now');
    }


//自動再生用とかのがいいかも
    function carouselSlide(index,doTransition){
        wrapperItems.forEach(item=>{
            item.style.transition = (doTransition) ? `transform ${transitionSecond}s ease` : 'none';
            item.style.transform = `translate3d(${(-index) * 100}%,0,0)`;
        })
        if(index == 0 || index == wrapperItems.length - 1){
            pendingJumpTo = (index == 0)? wrapperItems.length - 2 : 1;
            return index;
        }

        updateIndicators(index);
        return index;
    }

    //インジケーター生成
    if(showIndicators){
        const indicatorWrapper = document.createElement('div');
        indicatorWrapper.classList.add('indicator-wrapper');
        root.appendChild(indicatorWrapper);
        for(let i = 0;i < itemsLen;i++){
            const div = document.createElement('div');
            (i == 0)? div.classList.add('now') : div.classList.remove('now');
            indicatorWrapper.appendChild(div);
        }
        indicator = indicatorWrapper.querySelectorAll('div');
        //インジケータークリック時の処理
        indicator.forEach((ind,index) => {
            ind.addEventListener('click',()=>{
                managePlay('stop');
                currentindex = index + 1;
                currentindex = carouselSlide(currentindex,true);
                managePlay('start');
            })
        });
    }
    //ここまではまぁまぁきれい

    //モーダル作成
    if(showModal){
        //モーダル画面生成
        const modal = document.createElement('div');
        modal.classList.add('modal'); modal.classList.add('nodisplay');
        document.body.appendChild(modal);
        const modalImg = document.createElement('img'); modalImg.draggable = false;
        modalImg.classList.add('modal-img');
        modalImg.src = `${carouselImgs[0].src}`;
        const prevbtn = document.createElement('button');
        const nextbtn = document.createElement('button');
        const closebtn = document.createElement('button');
        prevbtn.textContent = '\u276E'; nextbtn.textContent = '\u276F'; closebtn.textContent = '\u00D7';
        prevbtn.classList.add('modal-prev'); nextbtn.classList.add('modal-next'); closebtn.classList.add('modal-close');
        modal.appendChild(prevbtn); modal.appendChild(modalImg); modal.appendChild(nextbtn); modal.appendChild(closebtn);
    
        //altのテキスト表示
        let txt;
        if(showAltText){
            txt = document.createElement('p');
            txt.classList.add('alt');
            txt.textContent = `${carouselImgs[currentindex].alt}`;
            modal.appendChild(txt);
        }
        
        //モーダルイベント設定
        //開く処理
        carouselImgs.forEach((img,index)=>{
            img.addEventListener('click',()=>{
                //indexでcurrentindexを1~max-1までにしておくと安心かも
                if(isDragged) return;
                modal.classList.remove('nodisplay');
                modalImg.src = img.src;
                txt.textContent = `${img.alt}`;
                managePlay('stop');
            })
        })
        
        //画像変更の処理
        const moveImg = () => {
            if(currentindex == 0 || currentindex == wrapperItems.length - 1)
                currentindex = (currentindex == 0)? wrapperItems.length - 2 : 1;
            modalImg.src = carouselImgs[currentindex].src;
            txt.textContent = `${carouselImgs[currentindex].alt}`;
            currentindex = carouselSlide(currentindex,false);
        }

        prevbtn.addEventListener('click',()=>{
            currentindex = searchindex(carouselImgs,currentindex,-1);
            slideDirection = -1;
            moveImg();
        });
        
        nextbtn.addEventListener('click',()=>{
            currentindex = searchindex(carouselImgs,currentindex,1);
            slideDirection = 1;
            moveImg();
        });

        //閉じる処理
        const close = ()=>{
            modal.classList.add('nodisplay');
            managePlay('start');
        }

        modal.addEventListener('click',(e)=>{
            if(e.target === modal){
                close();
            }
        })

        closebtn.addEventListener('click',()=>{
            close();
        });

        //今はいいけど、スライドとスワイプでも画像変えたいからよろしく
    }

    //自動再生処理
    if(loop){
        intervalId = setInterval(()=>{
            slideDirection = 1;
            currentindex = carouselSlide(currentindex + 1,true);
        }, loopSecond);
        const obsever = new IntersectionObserver((entries) => {
            entries.forEach(entry=>{
                if(entry.isIntersecting) managePlay('start');
                else managePlay('stop');
            });
        },{threshold : 1});
        obsever.observe(root);
    }

    //カルーセル本体
    let startX;
    let isDown = false;
    let isDragged = false;
    let imgwidth = carouselImgs[0].getBoundingClientRect().width;
    let walk;

    //ダミー要素作成
    wrapper.insertBefore(copyLast.cloneNode(true),wrapper.firstChild);
    wrapper.appendChild(copyZero.cloneNode(true));

    //ダミー作成後要素再取得
    wrapperItems = root.querySelectorAll('.carousel-link');
    carouselImgs = root.querySelectorAll('.carousel-img');
    wrapperItems.forEach((item) => {
        item.style.transform = 'translate3d(-100%,0,0)';
    });
//自動再生以外には弱い
    wrapperItems[0].addEventListener('transitionend', () => {
        if (pendingJumpTo !== null) {
            wrapperItems.forEach(item => {
                item.style.transition = 'none';
                item.style.transform = `translate3d(${(-pendingJumpTo) * 100}%,0,0)`;
            });
            currentindex = pendingJumpTo;    
            pendingJumpTo = null;
        }
        updateIndicators(currentindex);
    });
    const getTranslateX = () => {
        let transform = window.getComputedStyle(wrapperItems[0]).transform;
        if (transform !== 'none') {
            const matrixValues = transform.match(/matrix\(([^)]+)\)/)[1].split(', ');
            return parseFloat(matrixValues[4]) * 100 / imgwidth;
        }
    }
    let translateX;
    wrapper.addEventListener('mousedown',(e)=>{
        isDown = true;
        isDragged = false;
        pendingJumpTo = null;
        translateX = getTranslateX();
        wrapperItems.forEach((item) =>{
            item.style.transition = "none";
            item.style.transform = `translate3d(${translateX}%,0,0)`;
        });
        managePlay('stop');
        startX = e.pageX;
    });

    //ここでcurrentindexに変換する
    window.addEventListener('mouseup',(e)=>{
        if(!isDown) return;
        isDown = false;
        const translateX = getTranslateX();
        let diff = -(translateX + currentindex * 100); // 移動方向に合わせて符号調整
        let movedSlides = Math.round(diff / 100);      // 何枚分動いたか計算
        if (movedSlides !== 0) {
            slideDirection = Math.sign(movedSlides);
            currentindex = searchindex(wrapperItems, currentindex, movedSlides);
        }
        //スナップ処理
        currentindex = carouselSlide(currentindex,true);
        managePlay('start');
    });

    window.addEventListener('mousemove',(e)=>{
        if(!isDown) return;
        e.preventDefault();
        walk = (e.pageX - startX) * 100 / imgwidth + translateX;//多分こいつ悪い
        wrapperItems.forEach((item) => {
            item.style.transition = 'none';
            item.style.transform = `translate3d(${walk}%,0,0)`;
        });
        //ここにダミー処理入れてみる 厳密にじゃなくて、%指定の方で誤差認めてもいいかも
        // 現在の見かけの位置(%)
        let pos = walk;

        // ループ端の判定
        if (pos >= 0) {
            console.log('jump to last real slide');
            currentindex = wrapperItems.length - 2;
        } else if (pos <= (wrapperItems.length - 1) * -100) {
            console.log('jump to first real slide');
            currentindex = 1;
        }
        if(pos >= 0 || pos <= (wrapperItems.length - 1) * -100){
            walk = walk % 100;
            startX = e.pageX;
            translateX = -currentindex * 100;
            wrapperItems.forEach(item => {
                item.style.transition = 'none';
                item.style.transform = `translate3d(${translateX + walk}%,0,0)`;
            });
        }
        if(Math.abs(e.pageX - startX) > 10) isDragged = true; //移動距離が一定(今回は10)より大きいならドラッグ判定
    })

    wrapper.addEventListener('click', (e) => {
        if (isDragged) e.preventDefault(); 
    });

    //フォーカスされているかで自動再生を管理
    const managePlay = (dis) =>{
        if(dis == 'start'){
            if(intervalId !== null) return;
            intervalId = setInterval(()=>{
                currentindex = carouselSlide(currentindex + 1,true);
            }, loopSecond);
        }
        else if(dis == 'stop'){
            clearInterval(intervalId);
            intervalId = null;
        }
    }
    document.addEventListener('visibilitychange',()=>{
        if(document.hidden) managePlay('stop');
        else managePlay('start');
    })
    window.addEventListener('blur',()=>managePlay('stop'));
    window.addEventListener('focus',()=>managePlay('start'));

}
createCarousel({
    root : document.querySelector('.carousel'),
    loop : true,
    loopSecond : 4000 ,
    showIndicators : true,
    showModal : true,
    showAltText : true,
    transitionSecond : 0.5,
})