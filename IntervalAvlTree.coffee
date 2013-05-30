### 
Interval Tree

Based on
[1] AvlTree http://docs.closure-library.googlecode.com/git/class_goog_structs_AvlTree.html
[2] Introduction to algorithms / Thomas H. Cormen . . . [et al.].—3rd ed., The MIT Press, ISBN 978-0-262-03384-8
        Section 14.3: Interval trees, pp. 348–354
[3] http://en.wikipedia.org/wiki/Interval_tree#Augmented_tree
###

# Interval values are expected to be in form of {low: 3, high: 10, ...}
intervalComparator = (a, b) ->
    if a.low < b.low
        -1
    else if a.low > b.low
        1
    else
        if a.high < b.high
            -1
        else if a.high > b.high
            1
        else
            0

Ext.define 'Sch.lib.IntervalAvlTree',
    comparator_: intervalComparator
    root_: null
    minNode_: null
    maxNode_: null    

    statics:
        createValue: (low, high, tag) ->
            low: low
            high: high
            tag: tag

    constructor: () ->
        @

    add: (value) ->
        unless @root_?
            @root_ = new Sch.lib.IntervalAvlTreeNode(value)
            @minNode_ = @root_
            @maxNode_ = @root_
            return @root_.value
        newNode = null
        oldNode = null
        @traverse_ (node) ->
            retNode = null
            if @comparator_(node.value, value) > 0
                retNode = node.left
                unless node.left?
                    newNode = new Sch.lib.IntervalAvlTreeNode(value, node)
                    node.left = newNode
                    @minNode_ = newNode if node is @minNode_
            else if @comparator_(node.value, value) < 0
                retNode = node.right
                unless node.right?
                    newNode = new Sch.lib.IntervalAvlTreeNode(value, node)
                    node.right = newNode
                    @maxNode_ = newNode if node is @maxNode_
            else
                oldNode = node
            retNode

        if newNode
            @traverse_ ((node) ->
                node.count++
                node.parent
            ), newNode.parent
            @balance_ newNode.parent
        (newNode or oldNode).value

    remove: (value) ->
        retValue = null
        @traverse_ (node) ->
            retNode = null
            if @comparator_(node.value, value) > 0
                retNode = node.left
            else if @comparator_(node.value, value) < 0
                retNode = node.right
            else
                retValue = node.value
                @removeNode_ node
            retNode
        retValue

    clear: () ->
        @root_ = null
        @minNode_ = null
        @maxNode_ = null

    contains: (value) ->
        @find(value) isnt null

    find: (value) ->
        found = null
        @traverse_ (node) ->
            retNode = null
            if @comparator_(node.value, value) > 0
                retNode = node.left
            else if @comparator_(node.value, value) < 0
                retNode = node.right
            else
                found = node
            retNode

        found and found.value

    query: (point) ->
        result = []
        node = @root_
        prev = null
        current = undefined
        value = undefined
        while node?
            current = node
            if prev is node.parent
                if point > node.max
                    node = current.parent
                    prev = current
                    continue
                if node.left?
                    node = current.left
                    prev = current
                    continue
                value = node.value
                if point < value.low
                    node = current.parent
                    prev = current
                    continue
                result.push value if point <= value.high
                node = (if (node.right?) then current.right else current.parent)
                prev = current
                continue
            else
                if prev is node.left
                    value = node.value
                    if point < value.low
                        node = current.parent
                        prev = current
                        continue
                    result.push value if point <= value.high
                    if node.right?
                        node = current.right
                        prev = current
                        continue
                node = current.parent
                prev = current
                continue
        result

    getCount: () ->
        (if @root_ then @root_.count else 0)

    getKthValue: (k) ->
        return null if k < 0 or k >= @getCount()
        @getKthNode_(k).value

    getMinimum: () ->
        @getMinNode_().value

    getMaximum: () ->
        @getMaxNode_().value

    getHeight: () ->
        (if @root_ then @root_.height else 0)

    getValues: () ->
        ret = []
        @inOrderTraverse (value) ->
            ret.push value

        ret

    inOrderTraverse: (func, opt_startValue) ->
        return    unless @root_
        startNode = undefined
        if opt_startValue
            @traverse_ (node) ->
                retNode = null
                if @comparator_(node.value, opt_startValue) > 0
                    retNode = node.left
                    startNode = node
                else if @comparator_(node.value, opt_startValue) < 0
                    retNode = node.right
                else
                    startNode = node
                retNode

        else
            startNode = @getMinNode_()
        node = startNode
        prev = (if startNode.left then startNode.left else startNode)
        while node?
            if node.left? and node.left isnt prev and node.right isnt prev
                node = node.left
            else
                return if func(node.value)    unless node.right is prev
                temp = node
                node = (if node.right? and node.right isnt prev then node.right else node.parent)
                prev = temp

    reverseOrderTraverse: (func, opt_startValue) ->
        return    unless @root_
        startNode = undefined
        if opt_startValue
            @traverse_ (node) ->
                retNode = null
                if @comparator_(node.value, opt_startValue) > 0
                    retNode = node.left
                else if @comparator_(node.value, opt_startValue) < 0
                    retNode = node.right
                    startNode = node
                else
                    startNode = node
                retNode

        else
            startNode = @getMaxNode_()
        node = startNode
        prev = (if startNode.right then startNode.right else startNode)
        while node?
            if node.right? and node.right isnt prev and node.left isnt prev
                node = node.right
            else
                return if func(node.value)    unless node.left is prev
                temp = node
                node = (if node.left? and node.left isnt prev then node.left else node.parent)
                prev = temp

    traverse_: (traversalFunc, opt_startNode, opt_endNode) ->
        node = (if opt_startNode then opt_startNode else @root_)
        endNode = (if opt_endNode then opt_endNode else null)
        while node and node isnt endNode
            node = traversalFunc.call @, node

    balance_: (node) ->
        @traverse_ ((node) ->
            lh = (if node.left then node.left.height else 0)
            rh = (if node.right then node.right.height else 0)
            if lh - rh > 1
                @leftRotate_ node.left if node.left.right and (not node.left.left or node.left.left.height < node.left.right.height)
                @rightRotate_ node
            else if rh - lh > 1
                @rightRotate_ node.right if node.right.left and (not node.right.right or node.right.right.height < node.right.left.height)
                @leftRotate_ node
            lh = (if node.left then node.left.height else 0)
            rh = (if node.right then node.right.height else 0)
            node.height = Math.max(lh, rh) + 1
            node.updateMax()
            node.parent
        ), node

    leftRotate_: (node) ->
        if node.isLeftChild()
            node.parent.left = node.right
            node.right.parent = node.parent
        else if node.isRightChild()
            node.parent.right = node.right
            node.right.parent = node.parent
        else
            @root_ = node.right
            @root_.parent = null
        temp = node.right
        node.right = node.right.left
        node.right.parent = node if node.right?
        temp.left = node
        node.parent = temp
        temp.count = node.count
        node.count -= ((if temp.right then temp.right.count else 0)) + 1
        @traverse_ ((n) ->
            n.updateMax()
            (if (n.parent and (n.parent.max < n.max)) then n.parent else null)
        ), node

    rightRotate_: (node) ->
        if node.isLeftChild()
            node.parent.left = node.left
            node.left.parent = node.parent
        else if node.isRightChild()
            node.parent.right = node.left
            node.left.parent = node.parent
        else
            @root_ = node.left
            @root_.parent = null
        temp = node.left
        node.left = node.left.right
        node.left.parent = node if node.left?
        temp.right = node
        node.parent = temp
        temp.count = node.count
        node.count -= ((if temp.left then temp.left.count else 0)) + 1
        @traverse_ ((n) ->
            n.updateMax()
            (if (n.parent and (n.parent.max < n.max)) then n.parent else null)
        ), node

    removeNode_: (node) ->
        if node.left? or node.right?
            b = null
            r = undefined
            if node.left?
                r = @getMaxNode_(node.left)
                @traverse_ ((node) ->
                    node.count--
                    node.parent
                ), r
                unless r is node.left
                    r.parent.right = r.left
                    r.left.parent = r.parent if r.left
                    r.left = node.left
                    r.left.parent = r
                    b = r.parent
                r.parent = node.parent
                r.right = node.right
                r.right.parent = r if r.right
                @maxNode_ = r if node is @maxNode_
                r.count = node.count
            else
                r = @getMinNode_(node.right)
                @traverse_ ((node) ->
                    node.count--
                    node.parent
                ), r
                unless r is node.right
                    r.parent.left = r.right
                    r.right.parent = r.parent if r.right
                    r.right = node.right
                    r.right.parent = r
                    b = r.parent
                r.parent = node.parent
                r.left = node.left
                r.left.parent = r if r.left
                @minNode_ = r if node is @minNode_
                r.count = node.count
            if node.isLeftChild()
                node.parent.left = r
            else if node.isRightChild()
                node.parent.right = r
            else
                @root_ = r
            @balance_ (if b then b else r)
        else
            @traverse_ ((node) ->
                node.count--
                node.parent
            ), node.parent
            if node.isLeftChild()
                @special = 1
                node.parent.left = null
                @minNode_ = node.parent if node is @minNode_
                @balance_ node.parent
            else if node.isRightChild()
                node.parent.right = null
                @maxNode_ = node.parent if node is @maxNode_
                @balance_ node.parent
            else
                @clear()

    getKthNode_: (k, opt_rootNode) ->
        root = opt_rootNode or @root_
        numNodesInLeftSubtree = (if root.left then root.left.count else 0)
        if k < numNodesInLeftSubtree
            @getKthNode_ k, root.left
        else if k is numNodesInLeftSubtree
            root
        else
            @getKthNode_ k - numNodesInLeftSubtree - 1, root.right

    getMinNode_: (opt_rootNode) ->
        return @minNode_    unless opt_rootNode
        minNode = opt_rootNode
        @traverse_ ((node) ->
            retNode = null
            if node.left
                minNode = node.left
                retNode = node.left
            retNode
        ), opt_rootNode
        minNode

    getMaxNode_: (opt_rootNode) ->
        return @maxNode_    unless opt_rootNode
        maxNode = opt_rootNode
        @traverse_ ((node) ->
            retNode = null
            if node.right
                maxNode = node.right
                retNode = node.right
            retNode
        ), opt_rootNode
        maxNode

Ext.define 'Sch.lib.IntervalAvlTreeNode',
    value: null
    parent: null
    left: null
    right: null
    height: 1
    count: 1
    max: null

    constructor: (value, parent) ->
        @value = value
        @parent = parent or null
        @max = value.high
        @

    isRightChild: () ->
        !!@parent and @parent.right is @

    isLeftChild: () ->
        !!@parent and @parent.left is @

    updateMax: () ->
        @max = Math.max(@value.high, (if @left then @left.max else (-Number.MAX_VALUE)), (if @right then @right.max else (-Number.MAX_VALUE)))
